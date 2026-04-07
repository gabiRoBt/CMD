package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type EventType string

const (
	EventArenaList    EventType = "arena_list"
	EventGameStart    EventType = "game_start"
	EventPhaseChange  EventType = "phase_change"
	EventPouchResult  EventType = "pouch_result"
	EventAbilityFired EventType = "ability_fired"
	EventGameOver     EventType = "game_over"
	EventError        EventType = "error"
)

type WSEvent struct {
	Type    EventType   `json:"type"`
	Payload interface{} `json:"payload"`
}

type GameStartPayload struct {
	ArenaID    string `json:"arena_id"`
	SSHCommand string `json:"ssh_command"`
	Role       string `json:"role"`
	Phase      string `json:"phase"`
	SetupSecs  int    `json:"setup_seconds"`
}

type PhaseChangePayload struct {
	ArenaID    string `json:"arena_id"`
	Phase      string `json:"phase"`
	SSHCommand string `json:"ssh_command,omitempty"`
	MessageRO  string `json:"message_ro"`
}

type PouchResultPayload struct {
	ArenaID   string   `json:"arena_id"`
	Abilities []string `json:"abilities"`
}

// AbilityFiredPayload — broadcast after every ability/repair.
type AbilityFiredPayload struct {
	ArenaID  string `json:"arena_id"`
	TargetID string `json:"target_id"`
	Ability  string `json:"ability"`
}

type GameOverPayload struct {
	ArenaID    string `json:"arena_id"`
	WinnerID   string `json:"winner_id"`
	WinnerRole string `json:"winner_role"`
	YouWon     bool   `json:"you_won"`
	Draw       bool   `json:"draw"`
}

type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	playerID string
}

func NewClient(conn *websocket.Conn, playerID string) *Client {
	return &Client{
		conn:     conn,
		send:     make(chan []byte, 64),
		playerID: playerID,
	}
}

func (c *Client) PlayerID() string {
	return c.playerID
}

type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool

	broadcast chan []byte
	direct    chan directMessage

	Register   chan *Client
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
		Register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Connected: %s", client.playerID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[Hub] Disconnected: %s", client.playerID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- msg:
				default:
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

func (h *Hub) Broadcast(event WSEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("[Hub] Marshal error: %v", err)
		return
	}
	h.broadcast <- data
}

func (h *Hub) SendToPlayer(playerID string, event WSEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("[Hub] Marshal error: %v", err)
		return
	}
	h.direct <- directMessage{playerID: playerID, data: data}
}

func (c *Client) WritePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("[Hub] Write error for %s: %v", c.playerID, err)
			return
		}
	}
}

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
