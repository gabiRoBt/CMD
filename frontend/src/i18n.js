export const i18n = {
    ro: {
        // App header & audio
        audioBtn: "AUDIO",
        volOn: "VOL ON",
        volOff: "VOL OFF",
        musicLbl: "MUZICĂ",
        sfxLbl: "SFX",
        btnLogout: "DECONECTARE",
        lblOnline: "ONLINE",
        lblOffline: "OFFLINE",
        lblGuestUpper: "(VIZITATOR)",
        lblElo: "ELO",

        // Identificare / Auth
        titleAuth:     "// IDENTIFICARE",
        tabLogin:      "CONECTARE",
        tabSignup:     "ÎNREGISTRARE",
        tabGuest:      "VIZITATOR",
        lblUsername:   "NUME UTILIZATOR",
        lblPassword:   "PAROLĂ",
        lblPrefName:   "NUME PREFERAT",
        guestWarning:  "Conturile de vizitator pot juca doar meciuri amicale și nu primesc ELO.",
        btnConnecting: "SE CONECTEAZĂ...",
        lblError:      "EROARE",
        btnConnect:    "CONECTARE LA REȚEA",

        // Arenă Create/Panel
        titleArena:    "// CREARE ARENĂ COMBAT",
        btnCreate:     "[ + ] CREAZĂ ARENĂ",
        btnJoin:       "[ -> ] ALĂTURĂ-TE",
        btnReady:      "[ v ] SUNT GATA",
        btnLeave:      "[ X ] PLEACĂ",
        lblArenaName:  "NUME ARENĂ",
        lblMatchType:  "TIP MECI",
        lblCasual:     "AMICAL",
        lblComp:       "COMPETITIV (ELO)",
        lblSysOverview:"[?] SUMAR SISTEM",
        descOverview:  "Bătălie 1v1 la terminal. Conectare SSH, ascunde codurile nucleare și atacă inamicul. Găsește fișiere weapon_*.bin pentru abilități.",
        descScramble:  "Amestecă tastele inamicului",
        descRepair:    "Repară ultimul atac suferit",
        descReveal:    "Arată o bucată din codul inamic",
        descRocket:    "Distruge un folder inamic",
        lblArenaDetails:"// DETALII ARENĂ",
        lblTypeCasual: "Tip: Amical",
        lblTypeComp:   "Tip: Competitiv (ELO)",
        lblRoleHost:   "Rolul tău: Gazdă",
        lblRoleGuest:  "Rolul tău: Invitat",
        statusWaitMatch:"Așteptare adversar...",

        errArenaCreate:"Eroare la crearea arenei.",
        statusWaitPeer:"Așteaptă un adversar, apoi apasă SUNT GATA.",
        statusReadyGo: "Apasă SUNT GATA când ești pregătit.",
        statusPrep:    "Gata! Așteaptă confirmarea adversarului...",

        // Lista
        titleList:     "// ARENE DISPONIBILE",
        emptyList:     "Nicio arenă activă.",
        btnRefresh:    "[ ↻ ] ÎMPROSPĂTEAZĂ",
        lblFull:       "PLIN",
        errSelectArena:"Selectează o arenă",
        errAlreadyInArena:"Ești deja într-o arenă",
        errYourArena:  "Aceasta este arena ta",
        errArenaFull:  "Arena este plină",
        errGuestComp:  "Vizitatorii nu pot juca competitiv",

        // Faze
        phaseSetup:    ">> FAZA CONSTRUIRE",
        phaseInfil:    "!! FAZA INFILTRARE",
        arenaStarting: "ARENA PORNEȘTE",



        // Terminal
        termTitle:     "CMD :: TERMINAL SECURIZAT",

        // Notificări
        notifOnlyInfil:"DOAR ÎN FAZA INFILTRARE!",

        // Game over
        winTitle:      "VICTORIE",
        loseTitle:     "ÎNFRÂNGERE",
        drawTitle:     "-- REMIZĂ --",
        subDraw:       "Timpul a expirat. Niciun sistem nu a fost compromis.",
        subWin:        "Sistemul inamic a fost distrus.",
        subLose:       "Sistemul tău a fost compromis.",
        btnRestart:    "[ <- ] ÎNAPOI LA LOBBY",

        // Canvas labels
        canvasEnemy:   "SISTEM INAMIC",
        canvasYours:   "BAZA TA",

        // Ability pills
        abilityUsed:       "Deja utilizat",
        abilityUseLabel:   "[folosește]",
        abilityUsedLabel:  "FOLOSIT",
        pouchEmpty:    "-- BAZĂ GOALĂ --",
        pouchHint:     "[ mv weapon_*.bin ~/bază/ ]",

        // Footer
        footerArena:   "ARENĂ",
        footerRole:    "ROL",

        // Status
        errName:       "Introdu un callsign!",
        hostText:      "GAZDĂ:",
        guestText:     "INVITAT:",
        waitText:      "așteaptă...",
    },
    en: {
        // App header & audio
        audioBtn: "AUDIO",
        volOn: "VOL ON",
        volOff: "VOL OFF",
        musicLbl: "MUSIC",
        sfxLbl: "SFX",
        btnLogout: "LOGOUT",
        lblOnline: "ONLINE",
        lblOffline: "OFFLINE",
        lblGuestUpper: "(GUEST)",
        lblElo: "ELO",

        // Identification / Auth
        titleAuth:     "// IDENTIFICATION",
        tabLogin:      "LOGIN",
        tabSignup:     "SIGN UP",
        tabGuest:      "GUEST",
        lblUsername:   "USERNAME",
        lblPassword:   "PASSWORD",
        lblPrefName:   "PREFERRED NAME",
        guestWarning:  "Guest accounts can only play casual arenas and do not have ELO.",
        btnConnecting: "CONNECTING...",
        lblError:      "ERROR",
        btnConnect:    "CONNECT TO NETWORK",

        // Arena Create/Panel
        titleArena:    "// CREATE COMBAT ARENA",
        btnCreate:     "[ + ] CREATE ARENA",
        btnJoin:       "[ -> ] JOIN SELECTED",
        btnReady:      "[ v ] I AM READY",
        btnLeave:      "[ X ] LEAVE",
        lblArenaName:  "ARENA NAME",
        lblMatchType:  "MATCH TYPE",
        lblCasual:     "CASUAL",
        lblComp:       "COMPETITIVE (ELO)",
        lblSysOverview:"[?] SYSTEM OVERVIEW",
        descOverview:  "1v1 tactical terminal battle. Connect via SSH, hide your nuclear codes, exploit the enemy container. Collect weapon_*.bin files to unlock abilities.",
        descScramble:  "Remaps enemy commands",
        descRepair:    "Counters last attack",
        descReveal:    "Reveals piece of enemy code",
        descRocket:    "Destroys an opponent folder",
        lblArenaDetails:"// ARENA DETAILS",
        lblTypeCasual: "Type: Casual",
        lblTypeComp:   "Type: Competitive (ELO)",
        lblRoleHost:   "Your Role: Host",
        lblRoleGuest:  "Your Role: Guest",
        statusWaitMatch:"Waiting for opponent...",

        errArenaCreate:"Failed to create arena.",
        statusWaitPeer:"Wait for an opponent, then press I AM READY.",
        statusReadyGo: "Press I AM READY when you are prepared.",
        statusPrep:    "Ready! Waiting for opponent to ready up...",

        // List
        titleList:     "// AVAILABLE ARENAS",
        emptyList:     "No active arenas.",
        btnRefresh:    "[ ↻ ] REFRESH",
        lblFull:       "FULL",
        errSelectArena:"Select an arena first",
        errAlreadyInArena:"You are already in an arena",
        errYourArena:  "This is your arena",
        errArenaFull:  "Arena is full",
        errGuestComp:  "Guests cannot join competitive matches",

        // Phases
        phaseSetup:    ">> SETUP PHASE",
        phaseInfil:    "!! INFILTRATE PHASE",
        arenaStarting: "ARENA STARTING",



        // Terminal
        termTitle:     "CMD :: SECURE TERMINAL",

        // Notifications
        notifOnlyInfil:"ONLY IN INFILTRATE PHASE!",

        // Game over
        winTitle:      "VICTORY",
        loseTitle:     "DEFEAT",
        drawTitle:     "-- DRAW --",
        subDraw:       "Time expired. Neither system was compromised.",
        subWin:        "Enemy system destroyed.",
        subLose:       "Your system was compromised.",
        btnRestart:    "[ <- ] BACK TO LOBBY",

        // Canvas labels
        canvasEnemy:   "ENEMY SYSTEM",
        canvasYours:   "YOUR BASE",

        // Ability pills
        abilityUsed:       "Already used",
        abilityUseLabel:   "[use]",
        abilityUsedLabel:  "USED",
        pouchEmpty:    "-- POUCH EMPTY --",
        pouchHint:     "[ mv weapon_*.bin ~/pouch/ ]",

        // Footer
        footerArena:   "ARENA",
        footerRole:    "ROLE",

        // Status
        errName:       "Enter a callsign!",
        hostText:      "HOST:",
        guestText:     "GUEST:",
        waitText:      "waiting...",
    },
    es: {
        audioBtn: "AUDIO",
        volOn: "VOL ON",
        volOff: "VOL OFF",
        musicLbl: "MÚSICA",
        sfxLbl: "SFX",
        btnLogout: "SALIR",
        lblOnline: "EN LÍNEA",
        lblOffline: "DESCONECTADO",
        lblGuestUpper: "(INVITADO)",
        lblElo: "ELO",

        titleAuth:     "// IDENTIFICACIÓN",
        tabLogin:      "INICIAR SESIÓN",
        tabSignup:     "REGISTRARSE",
        tabGuest:      "INVITADO",
        lblUsername:   "USUARIO",
        lblPassword:   "CONTRASEÑA",
        lblPrefName:   "NOMBRE PREFERIDO",
        guestWarning:  "Las cuentas de invitado solo pueden jugar partidas amistosas y no tienen ELO.",
        btnConnecting: "CONECTANDO...",
        lblError:      "ERROR",
        btnConnect:    "CONECTAR A LA RED",

        titleArena:    "// CREAR ARENA DE COMBATE",
        btnCreate:     "[ + ] CREAR ARENA",
        btnJoin:       "[ -> ] UNIRSE SELECCIONADA",
        btnReady:      "[ v ] ESTOY LISTO",
        btnLeave:      "[ X ] SALIR",
        lblArenaName:  "NOMBRE DE ARENA",
        lblMatchType:  "TIPO DE PARTIDA",
        lblCasual:     "AMISTOSA",
        lblComp:       "COMPETITIVA (ELO)",
        lblSysOverview:"[?] RESUMEN DEL SISTEMA",
        descOverview:  "Batalla táctica 1v1 en terminal. Conéctate vía SSH, oculta tus códigos nucleares y ataca al contenedor enemigo. Encuentra weapon_*.bin para desbloquear habilidades.",
        descScramble:  "Reasigna comandos enemigos",
        descRepair:    "Contrarresta el último ataque",
        descReveal:    "Revela parte del código enemigo",
        descRocket:    "Destruye una carpeta enemiga",
        lblArenaDetails:"// DETALLES DE ARENA",
        lblTypeCasual: "Tipo: Amistosa",
        lblTypeComp:   "Tipo: Competitiva (ELO)",
        lblRoleHost:   "Tu rol: Anfitrión",
        lblRoleGuest:  "Tu rol: Invitado",
        statusWaitMatch:"Esperando oponente...",
        errArenaCreate:"Error al crear arena.",
        statusWaitPeer:"Espera a un oponente, luego presiona ESTOY LISTO.",
        statusReadyGo: "Presiona ESTOY LISTO cuando estés preparado.",
        statusPrep:    "¡Listo! Esperando confirmación del oponente...",

        titleList:     "// ARENAS DISPONIBLES",
        emptyList:     "No hay arenas activas.",
        btnRefresh:    "[ ↻ ] ACTUALIZAR",
        lblFull:       "LLENO",
        errSelectArena:"Selecciona una arena",
        errAlreadyInArena:"Ya estás en una arena",
        errYourArena:  "Esta es tu arena",
        errArenaFull:  "La arena está llena",
        errGuestComp:  "Los invitados no pueden jugar partidas competitivas",

        phaseSetup:    ">> FASE DE PREPARACIÓN",
        phaseInfil:    "!! FASE DE INFILTRACIÓN",
        arenaStarting: "ARENA INICIANDO",



        termTitle:     "CMD :: TERMINAL SEGURO",
        notifOnlyInfil:"¡SOLO EN LA FASE DE INFILTRACIÓN!",

        winTitle:      "VICTORIA",
        loseTitle:     "DERROTA",
        drawTitle:     "-- EMPATE --",
        subDraw:       "Tiempo agotado. Ningún sistema fue comprometido.",
        subWin:        "Sistema enemigo destruido.",
        subLose:       "Tu sistema ha sido comprometido.",
        btnRestart:    "[ <- ] VOLVER AL LOBBY",

        canvasEnemy:   "SISTEMA ENEMIGO",
        canvasYours:   "TU BASE",

        abilityUsed:       "Ya usado",
        abilityUseLabel:   "[usar]",
        abilityUsedLabel:  "USADO",
        pouchEmpty:    "-- BOLSA VACÍA --",
        pouchHint:     "[ mv weapon_*.bin ~/bolsa/ ]",

        footerArena:   "ARENA",
        footerRole:    "ROL",

        errName:       "¡Ingresa un identificador!",
        hostText:      "ANFITRIÓN:",
        guestText:     "INVITADO:",
        waitText:      "esperando...",
    },
    fr: {
        audioBtn: "AUDIO",
        volOn: "VOL ON",
        volOff: "VOL OFF",
        musicLbl: "MUSIQUE",
        sfxLbl: "SFX",
        btnLogout: "DÉCONNEXION",
        lblOnline: "EN LIGNE",
        lblOffline: "HORS LIGNE",
        lblGuestUpper: "(INVITÉ)",
        lblElo: "ELO",

        titleAuth:     "// IDENTIFICATION",
        tabLogin:      "CONNEXION",
        tabSignup:     "S'INSCRIRE",
        tabGuest:      "INVITÉ",
        lblUsername:   "NOM D'UTILISATEUR",
        lblPassword:   "MOT DE PASSE",
        lblPrefName:   "NOM PRÉFÉRÉ",
        guestWarning:  "Les comptes invités ne peuvent jouer que des parties amicales et n'ont pas d'ELO.",
        btnConnecting: "CONNEXION...",
        lblError:      "ERREUR",
        btnConnect:    "SE CONNECTER AU RÉSEAU",

        titleArena:    "// CRÉER UNE ARÈNE DE COMBAT",
        btnCreate:     "[ + ] CRÉER ARÈNE",
        btnJoin:       "[ -> ] REJOINDRE",
        btnReady:      "[ v ] JE SUIS PRÊT",
        btnLeave:      "[ X ] QUITTER",
        lblArenaName:  "NOM DE L'ARÈNE",
        lblMatchType:  "TYPE DE MATCH",
        lblCasual:     "AMICAL",
        lblComp:       "COMPÉTITIF (ELO)",
        lblSysOverview:"[?] APERÇU DU SYSTÈME",
        descOverview:  "Bataille tactique 1v1 dans un terminal. Connectez-vous, cachez vos codes nucléaires et attaquez l'ennemi. Collectez des weapon_*.bin.",
        descScramble:  "Réaffecte les touches ennemies",
        descRepair:    "Contre la dernière attaque",
        descReveal:    "Révèle un bout de code ennemi",
        descRocket:    "Détruit un dossier adverse",
        lblArenaDetails:"// DÉTAILS DE L'ARÈNE",
        lblTypeCasual: "Type : Amical",
        lblTypeComp:   "Type : Compétitif (ELO)",
        lblRoleHost:   "Votre rôle : Hôte",
        lblRoleGuest:  "Votre rôle : Invité",
        statusWaitMatch:"En attente de l'adversaire...",

        errArenaCreate:"Échec de la création de l'arène.",
        statusWaitPeer:"Attendez un adversaire, puis appuyez sur PRÊT.",
        statusReadyGo: "Appuyez sur PRÊT quand vous l'êtes.",
        statusPrep:    "Prêt ! En attente de la confirmation de l'adversaire...",

        titleList:     "// ARÈNES DISPONIBLES",
        emptyList:     "Aucune arène active.",
        btnRefresh:    "[ ↻ ] ACTUALISER",
        lblFull:       "PLEIN",
        errSelectArena:"Sélectionnez une arène",
        errAlreadyInArena:"Vous êtes déjà dans une arène",
        errYourArena:  "C'est votre arène",
        errArenaFull:  "L'arène est pleine",
        errGuestComp:  "Les invités ne jouent pas en compétitif",

        phaseSetup:    ">> PHASE DE PRÉPARATION",
        phaseInfil:    "!! PHASE D'INFILTRATION",
        arenaStarting: "L'ARÈNE COMMENCE",



        termTitle:     "CMD :: TERMINAL SÉCURISÉ",

        notifOnlyInfil:"UNIQUEMENT EN INFILTRATION !",

        winTitle:      "VICTOIRE",
        loseTitle:     "DÉFAITE",
        drawTitle:     "-- MATCH NUL --",
        subDraw:       "Temps écoulé. Aucun système n'a été compromis.",
        subWin:        "Système ennemi détruit.",
        subLose:       "Votre système a été compromis.",
        btnRestart:    "[ <- ] RETOUR AU LOBBY",

        canvasEnemy:   "SYSTÈME ENNEMI",
        canvasYours:   "VOTRE BASE",

        abilityUsed:       "Déjà utilisé",
        abilityUseLabel:   "[utiliser]",
        abilityUsedLabel:  "UTILISÉ",
        pouchEmpty:    "-- SAC VIDE --",
        pouchHint:     "[ mv weapon_*.bin ~/sac/ ]",

        footerArena:   "ARÈNE",
        footerRole:    "RÔLE",

        errName:       "Entrez un identifiant !",
        hostText:      "HÔTE :",
        guestText:     "INVITÉ :",
        waitText:      "en attente...",
    },
};
