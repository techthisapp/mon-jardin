# Bords de la quinzaine

Note de conception. En production, commits 108c3c0 et 3deaa20.

## État de départ

La synthèse de l'écran du jour ne portait qu'un seul des deux bords de la
fenêtre. La phrase de tête finissait par « avant la fin de la quinzaine » quand
une action se terminait, et les lignes portaient la marque « · dernière
quinzaine ». Aucune de ces mentions n'était cliquable.

Ce qui venait de s'ouvrir ne se lisait nulle part. Une fenêtre entrée dans sa
première quinzaine s'affichait comme toutes les autres, alors que c'est le
moment où le geste devient possible et où le jardinier a le plus de latitude
pour le placer.

## Ce qui est dit

**La phrase des ouvertures**, sous la phrase de tête, d'un ton plus bas :
« Première quinzaine pour tailler, multiplier et semer. » Trois tâches nommées
au plus, le reste compté en fin de phrase. Quand une seule tâche s'ouvre, elle
nomme ses plantes, comme la phrase de tête.

Une tâche par entrée et non un verbe : la multiplication ouvre marcotter,
bouturer et greffer à la fois, ce qui ferait trois mentions d'une seule tâche.
Quand plusieurs verbes d'une même tâche s'ouvrent, la phrase prend le verbe
générique.

**Les marques de ligne.** Une tâche que la phrase a nommée ne reprend pas la
marque sur sa ligne : la marque « · première quinzaine » sert à retrouver celles
que le compte laissait dans l'ombre. Sans cette règle, le jardin de référence
affichait la marque sur cinq lignes sur six, ce qui la vidait de son sens et
allongeait la carte d'une ligne par tâche.

Ce qui se ferme prime sur ce qui s'ouvre : une ligne ne porte qu'une marque.

**Une fenêtre d'une seule quinzaine** compte pour ce qui se ferme, le plus
pressant des deux. Elle ne paraît donc pas dans les ouvertures.

## Ce qui est adressable

Les deux mentions sont des boutons et ouvrent chacune leur niveau, toutes tâches
confondues.

« Dernière quinzaine » montre les actions dont la fenêtre se ferme, « Première
quinzaine » celles dont la fenêtre vient de s'ouvrir. C'est la seule façon de
voir d'un coup les deux bords : la vue d'ensemble les disperse entre les tâches,
et le niveau d'une tâche n'en montre qu'une.

Le niveau emprunte le rendu de la liste complète sur un lot restreint, ses
sections restant celles des tâches. Le rail des sections cède la place au titre
du bord et à son compte : la quinzaine est le sujet, non la tâche où l'on se
trouve. Vidé par un filtre, le niveau ramène à la vue d'ensemble comme le ferait
une tâche vidée. Il se referme par le chevron de la barre et par le geste de
retour du téléphone.

### Le verbe restreint le bord à sa tâche

Les verbes posés à côté d'une mention de bord menaient à leur tâche entière.
« Première quinzaine pour tailler » ouvrait les huit tailles du moment, celles
ouvertes depuis des mois comprises : le mot promettait un filtre qu'il ne posait
pas, et la phrase perdait son sujet en chemin.

Un verbe posé près d'un bord mène au bord restreint à sa tâche. Le niveau nomme
les deux, la quinzaine en titre et la tâche à côté, d'un rang plus bas : le
titre se lirait sinon comme deux titres accolés. Les pastilles seules mènent au
bord entier.

La règle vaut des deux côtés. Le verbe de la phrase de tête, quand elle est
pressée, mène à la dernière quinzaine de sa tâche : la phrase pressée ne nomme
alors que les plantes dont la fenêtre se ferme, et son verbe doit mener au même
lot. Sans pression, la phrase nomme toutes les plantes de la tâche et le verbe
ouvre la tâche entière.

Un seul branchement sert les lignes, les verbes et les pastilles : un verbe
porte les deux attributs, et deux écouteurs se seraient succédé sur lui, le
second effaçant le travail du premier.

Les marques de ligne restent des mentions, non des liens : elles sont à
l'intérieur du bouton qui ouvre leur tâche, et un bouton dans un bouton n'est ni
valide ni utilisable au clavier. La tâche est de toute façon la destination
naturelle d'un clic sur sa ligne.

## La pastille de bord dans la liste des actions

Le bord de la fenêtre chassait la borne. Une ligne de dernière quinzaine
affichait « dernière quinzaine » à la place de « jusqu'à mi-août » et ne disait
donc plus jusqu'à quand elle courait ; une ligne de première quinzaine ne disait
pas du tout qu'elle venait de s'ouvrir, le filet de bord dans la marge étant la
seule marque.

Les deux paraissent : la pastille du bord, puis la borne, qui reste dans tous
les cas. La pastille dit où l'on est dans la fenêtre, la borne jusqu'à quand
elle court.

Les deux pastilles partagent la même forme, la même chasse et la même casse.
L'échéance garde la teinte chaude, l'ouverture prend le vert de la végétation :
le geste devient possible, il ne presse pas.

Pastille et borne forment un bloc qui passe à la ligne d'un seul tenant quand le
nom prend toute la largeur. Rognées par le nom, elles laissaient lire
« Lavand » et « Frambo » : c'est la mention qui descend, jamais le nom qui cède.

## Typographie

Les deux liens de bord portent un filet sous le mot, seule marque du lien. Le
filet chaud, rouge-brun, reste à l'échéance. L'ouverture prend le vert de la
végétation.

La phrase des ouvertures est en 14,5 points contre 19 pour la phrase de tête, en
encre douce. Elle se place entre la tête et les lignes.

## Contrôles

`outils/essais/quinzaine.mjs`, 28 contrôles sur deux jardins.

Soixante plantes au deux août : la quinzaine ouvre cinq tâches et en ferme deux,
de quoi éprouver la phrase tronquée comme les marques de ligne. Les contrôles
portent sur le texte des deux phrases, sur le partage entre la phrase et les
marques, sur la nature des deux liens et sur leurs filets, puis sur le contenu
de chaque niveau : titre, compte, absence de rail, sections, et le fait que
toutes les actions montrées appartiennent bien au bord ouvert.

Huit contrôles portent sur le filtre et sur les pastilles : les verbes des deux
phrases portent leur tâche et leur bord, le niveau ouvert par un verbe nomme la
quinzaine et la tâche, il ne montre qu'une section et rien qui ne soit du bord,
la tâche entière en porte davantage, et chaque action montrée porte la pastille
de son bord ainsi que sa borne.

Le contrôle qui compare le bord restreint à la tâche entière est celui qui vaut :
sans lui, un filtre qui ne filtrerait rien passerait, la tâche ouverte contenant
de toute façon les actions du bord.

Douze plantes : rien ne se ferme, la phrase de tête perd son échéance et le lien
qui la portait disparaît, aucune action ne se tenant derrière.
