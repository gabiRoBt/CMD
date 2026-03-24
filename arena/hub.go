package arena

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// EventType definește tipul de eveniment trimis prin WebSocket
type EventType string

const (
	EventArenaList    EventType = "arena_list"
	EventArenaUpdated EventType = "arena_updated"
	EventGameStart    EventType = "game_start"
	EventPhaseChange  EventType = "phase_change"
	EventGameOver     EventType = "game_over"
	EventError        EventType = "error"
)

// WSEvent este structura generică trimisă prin WebSocket
type WSEvent struct {
	Type    EventType   `json:"type"`
	Payload interface{} `json:"payload"`
}

// GameStartPayload — trimis ambilor jucători când SSH e gata
type GameStartPayload struct {
	ArenaID    string `json:"arena_id"`
	SSHCommand string `json:"ssh_command"`
	Role       string `json:"role"`
	Phase      string `json:"phase"`
	SetupSecs  int    `json:"setup_seconds"`
	PrivateKey string `json:"private_key"`
}

// PhaseChangePayload — trimis când faza se schimbă
type PhaseChangePayload struct {
	ArenaID    string `json:"arena_id"`
	Phase      string `json:"phase"`
	SSHCommand string `json:"ssh_command,omitempty"` // nou port SSH la Infiltrate
	MessageRO  string `json:"message_ro"`
}

// GameOverPayload — trimis la finalul meciului
type GameOverPayload struct {
	ArenaID    string `json:"arena_id"`
	WinnerID   string `json:"winner_id"`
	WinnerRole string `json:"winner_role"`
	YouWon     bool   `json:"you_won"`
}

// ArenaView — reprezentarea publică a unei arene (fără date sensibile)
type ArenaView struct {
	ID       string `json:"id"`
	Phase    string `json:"phase"`
	HostID   string `json:"host_id"`
	GuestID  string `json:"guest_id,omitempty"`
	HasGuest bool   `json:"has_guest"`
}

// Client reprezintă o conexiune WebSocket activă
type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	playerID string
	arenaID  string // arena în care se află (poate fi gol)
}

// Hub gestionează toate conexiunile WebSocket active
type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool

	// Canal pentru broadcast către toți clienții
	broadcast chan []byte

	// Canal pentru mesaje directe către un jucător specific
	direct chan directMessage

	register   chan *Client
	unregister chan *Client
}

type directMessage struct {
	playerID string
	data     []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		direct:     make(chan directMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Client conectat: %s", client.playerID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[Hub] Client deconectat: %s", client.playerID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- msg:
				default:
					// Buffer plin — client lent, îl ignorăm
				}
			}
			h.mu.RUnlock()

		case dm := <-h.direct:
			h.mu.RLock()
			for client := range h.clients {
				if client.playerID == dm.playerID {
					select {
					case client.send <- dm.data:
					default:
					}
					break
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast trimite un eveniment tuturor clienților conectați
func (h *Hub) Broadcast(event WSEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("[Hub] Eroare marshal broadcast: %v", err)
		return
	}
	h.broadcast <- data
}

// SendToPlayer trimite un eveniment unui singur jucător
func (h *Hub) SendToPlayer(playerID string, event WSEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("[Hub] Eroare marshal direct: %v", err)
		return
	}
	h.direct <- directMessage{playerID: playerID, data: data}
}

// WritePump pompează mesajele din canalul send către conexiunea WebSocket
func (c *Client) WritePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("[Hub] Eroare scriere WS pentru %s: %v", c.playerID, err)
			return
		}
	}
}

// ReadPump citește mesajele inbound (în principal pentru a detecta deconectarea)
func (c *Client) ReadPump(hub *Hub, onMessage func(playerID string, raw []byte)) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		if onMessage != nil {
			onMessage(c.playerID, msg)
		}
	}
}
