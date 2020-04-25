/*
Initialisation des modules node.js.
*/

var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);

const crypto = require("crypto");

var body_parser = require("body-parser");
app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());

var mysql = require("mysql");
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'Racheletmoi2',
  database : 'TronDB',
  socketPath : '/opt/lampp/var/mysql/mysql.sock'//si votre mysql marche sans ca c'est mieux vous pouvais le supprimer moi je dois le rajuter
});
connection.connect(function(err) {
  if (err) console.log(err);
  connection.query("CREATE DATABASE IF NOT EXISTS TronDB", err => {
    if (err) console.log(err);
    connection.query("DROP TABLE IF EXISTS TronDB.joueurs", err => {
      if (err) console.log(err);
      connection.query(
        "CREATE TABLE TronDB.joueurs(pseudo VARCHAR(255),email VARCHAR(255), password VARCHAR(255))",
        err => {
          if (err) console.log(err);
          connection.query("TRUNCATE TABLE TronDB.joueurs", err => {
            if (err) console.log(err);
          });
        }
      );
    });
  });
});

/*
Initialisation des fichiers statiques 
et du fichier HTML à envoyer au client.
*/

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/pages/tron.html");
});

app.get("/jeu", (req, res) => {
  res.sendFile(__dirname + "/public/pages/jouer.html");
});

app.get("/inscription", (req, res) => {
  res.sendFile(__dirname + "/public/pages/inscription.html");
});

app.get("/connexion", (req, res) => {
  res.sendFile(__dirname + "/public/pages/connexion.html");
});

app.post("/inscription", (req, res) => {
  var requete =
    "SELECT COUNT(*) as nb FROM TronDB.joueurs WHERE TronDB.joueurs.pseudo = ? OR TronDB.joueurs.email = ?";
  connection.query(
    requete,
    [req.body.pseudo, req.body.email],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      if (result[0].nb == 1) {
        console.log("Pseudo ou email indisponible.");
        res.sendFile(__dirname + "/public/pages/inscription.html");
      } else {
        requete =
          "INSERT INTO TronDB.joueurs(pseudo,email,password) VALUES (?,?,?)";
        crypto.pbkdf2(
          req.body.mdp,
          req.body.pseudo,
          64000,
          32,
          "sha256",
          (err, derivedKey) => {
            connection.query(
              requete,
              [req.body.pseudo, req.body.email, derivedKey.toString("hex")],
              err => {
                console.log("Compte créé");
                res.sendFile(__dirname + "/public/pages/tron.html");
              }
            );
          }
        );
      }
    }
  );
});

app.post("/connexion", (req, res) => {
  var requete =
    "SELECT COUNT(*) as nb FROM TronDB.joueurs WHERE TronDB.joueurs.pseudo = ? AND TronDB.joueurs.password = ?";
  crypto.pbkdf2(
    req.body.mdp,
    req.body.pseudo,
    64000,
    32,
    "sha256",
    (err, derivedKey) => {
      connection.query(
        requete,
        [req.body.pseudo, derivedKey.toString("hex")],
        (err, result) => {
          if (err) {
            console.log(err);
          }
          if (result[0].nb == 1) {
            console.log("Connecté!");
            res.sendFile(__dirname + "/public/pages/tron.html");
          } else {
            console.log("Informations invalides.");
            res.sendFile(__dirname + "/public/pages/connexion.html");
          }
        }
      );
    }
  );
});

/*
Variables globales.
*/

var width = 500,
  height = 500,
  execution = false,
  carteTrajets = [],
  joueurs = [],
  vitesse = 4,
  id = 0;

/*
Gestion des signaux à écouter 
et à émettre.
*/

//Gestion de la connection d'un client au serveur.
io.sockets.on("connection", function(socket) {
  // 	Création d'un joueur associé à un client.
  var joueurAct = {
    pseudo: "test",
    x: 0,
    y: height / 2,
    dx: 1,
    dy: 0,
    chemin: [],
    id: id++,
    vivant: true
  };
  joueurAct.chemin.push({ x: joueurAct.x, y: joueurAct.y });

  //Gestion de l'appui sur les touches de déplacement lors du jeu.
  socket.on("change_dir", object => {
    if (
      (object.dx != joueurAct.dx && object.dy != joueurAct.dy) ||
      (object.dx != -joueurAct.dx && joueurAct.dy != object.dy)
    ) {
      joueurAct.dx = object.dx;
      joueurAct.dy = object.dy;
      joueurAct.chemin.push({ x: joueurAct.x, y: joueurAct.y });
    }
  });

  // Gestion du démarrage du jeu lors
  // de l'appui sur le bouton Start.
  socket.on("start", () => {
    socket.emit("start");
    if (execution == false)
      execution = setInterval(() => {
        move();
      }, 33);
  });

  // Ajout du joueur à la liste des joueurs.
  joueurs.push(joueurAct);

  // Envoi en broadcast du signal  de nouveau_joueur
  // aux joueurs pour qu'il soit ajouté à la
  // liste de joueur de chaque joueur.
  io.emit("nouveau_joueur", joueurAct);
});

// Envoi d'un signal pour initialiser
// les coordonnées de la carte coté client.
io.sockets.emit("init_carte", { width: width, height: height });

/*
Fonctions de la gestion du jeu.
*/

// Fonction de modification des coordonnées
// des joueurs en fonction de la direction.
function move() {
  for (let i of joueurs) {
    if (i.vivant) {
      for (let j = 0; j < vitesse; j++) {
        i.x += i.dx;
        i.y += i.dy;
        if (
          carteTrajets[i.x + 1] != undefined &&
          carteTrajets[i.x + 1][i.y + 1] != undefined
        ) {
          if (carteTrajets[i.x + 1][i.y + 1] != -1) {
            clearInterval(execution);
            execution = false;
            io.sockets.emit("stop");
            reset();
          } else {
            carteTrajets[i.x + 1][i.y + 1] = i.id;
            io.sockets.emit("move", i);
          }
        }
      }
    }
  }
}

// Fonction d'initialisation de la carte des trajets.
function initCarteTr() {
  let carteTrajets = Array(height + 3);
  for (let i = 0; i < height + 3; i++) {
    carteTrajets[i] = Array(width + 3);
    for (let j = 0; j < width + 3; j++) {
      if (i == 0 || j == 0 || i == height + 2 || j == width + 2) {
        carteTrajets[i][j] = -2;
      } else {
        carteTrajets[i][j] = -1;
      }
    }
  }
  return carteTrajets;
}

// Fonction de réinitialiation du jeu.
function reset() {
  joueurs = [];
  id = 0;
  carteTrajets = initCarteTr();
}

// Réinitialisation du jeu.
reset();

// Ecoute du port 8080 par le serveur.
server.listen(8080);
