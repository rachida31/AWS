/*
Variables globales.
*/

// Initialisation du canvas contenant le jeu.
var canvas = document.getElementById('jeu');
var ctx = canvas.getContext("2d");

var joueurs = []
var affichage = ()=>{
    afficheCarte();
    window.requestAnimationFrame(affichage)
};


/*
Initialisation des signaux à écouter
et à émettre.
*/

// Changement des informations des joueurs
// lorsqu'un signal move est reçu.
socket.on('move',(joueur)=>{
	joueurs[joueur.id] = joueur;
})

// Initialisation de la taille du canvas selon 
// les informations envoyées par le serveur.
socket.on('init_carte', (carte)=>{
	canvas.height = carte.height;
	canvas.width = carte.width;
});

// Ajout d'un joueur dans la liste des joueurs 
// lors de la réception du signal nouveau_joueur.
socket.on('nouveau_joueur',(joueur)=>{
	joueurs[joueur.id] = joueur;
});


// Arrêt de la boucle d'affichage
// lors de la réception du signal stop.
socket.on('stop', ()=>{
	window.cancelAnimationFrame(affichage);
});

// Démarrage de la boucle d'affichage
// lors de la réception du signal start.
socket.on('start', ()=>{
	window.requestAnimationFrame(affichage);
});

/*
Gestions des interactions entre l'utilisateur
et la page.
*/

// Définition de la fonction à appeler lors
// de l'appui sur le bouton Connexion.
document.getElementById('connec').onclick = ()=>{
}

// Définition de la fonction à appeler lors
// de l'appui sur le bouton Inscription.
document.getElementById('inscr').onclick = ()=>{

}

// Définition de la fonction à appeler lors
// de l'appui sur le bouton Start.
document.getElementById('start').onclick = ()=>{
	socket.emit('start');
}

// Définition de la fonction à appeler lors
// de l'appui sur les touches lors du jeu.
document.onkeydown = (event)=>{
	switch(event.code){
		case 'ArrowLeft':
			event.preventDefault();
			socket.emit('change_dir',{'dx':-1,'dy':0});
			break;
		case 'ArrowUp':
			event.preventDefault();
			socket.emit('change_dir',{'dx':0,'dy':-1});
			break;
		case 'ArrowRight':
			event.preventDefault();
			socket.emit('change_dir',{'dx':1,'dy':0});
			break;
		case 'ArrowDown':
			event.preventDefault();
			socket.emit('change_dir',{'dx':0,'dy':1});
			break;
	}
}

// Fonction d'affichage du point d'un joueur ainsi
// que son trajet parcouru.
function afficheJoueur(joueur){
	ctx.beginPath()
	ctx.arc(joueur.x,joueur.y,2,0,Math.PI*2);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	for(let i = 0; i < joueur.chemin.length-1 ;i++){
		ctx.moveTo(joueur.chemin[i].x,joueur.chemin[i].y);
		ctx.lineTo(joueur.chemin[i+1].x,joueur.chemin[i+1].y);
	}
	ctx.moveTo(joueur.chemin[joueur.chemin.length-1].x,joueur.chemin[joueur.chemin.length-1].y);
	ctx.lineTo(joueur.x,joueur.y);
	ctx.stroke();
}

// Fonction d'affichage de la carte complète
// avec joueurs et trajets.
function afficheCarte(){
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for (let i of joueurs){
		if(i.hasOwnProperty('id')) afficheJoueur(i);
	}
}

// Fonction qui initialise la carte avec les
// positions initiales des joueurs.
function initJoueurs(){
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for(let i of joueurs){
		if(i.hasOwnProperty('id')){
			ctx.beginPath()
			ctx.arc(i.x,i.y,2,0,Math.PI*2);
			ctx.fill();
			ctx.stroke();
		}
	}
}