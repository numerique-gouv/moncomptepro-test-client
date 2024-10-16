#language: fr
Fonctionnalité: Connexion de user@yopmail.com

  Scénario: Connexion d'un utilisateur
    Etant donné que je navigue sur la page
    Alors je vois "Bonjour monde !"
    Quand je clique sur le bouton ProConnect

    Quand je me connecte en tant que user@yopmail.com sur moncomptepro
    Et je vois "Votre organisation de rattachement" sur moncomptepro
    Et je clique sur "Continuer" sur moncomptepro

    Alors je suis redirigé sur "/"
    Et je vois "Information utilisateur"
    Et je vois "user@yopmail.com"
