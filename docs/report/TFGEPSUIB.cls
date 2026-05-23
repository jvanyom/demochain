% Aquest document defineix la classe
% TFGEPSUIB.cls utilitzada per a la
% realització de memories de TFG a 
% l'EPS de la UIB
% ----------------------------------------
% Els comentaris inclosos en aquest fitxer
% s'escriuen sense accents per tal de mantenir
% la seva independencia del sistema de codificacio
%-------------------------------------------------
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% NO ESTA PERMES MODIFICAR EL CONTINGUT D'AQUEST DOCUMENT. 
% QUALSEVOL MODIFICACIO POT ALTERAR LA SEVA VALIDESA I 
% EL FORMAT DEL DOCUMENT FINAL.
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\NeedsTeXFormat{LaTeX2e}[1999/12/01]
% \ProvidesClass{TFGEPSUIB}[2025/07/28 v1.5, Format LaTeX pel treball final de grau a l'EPS de la UIB]

%------------------------------------------------
% V1.5
% Adaptat a Reglament vigent a partir de curs 25/26
%------------------------------------------------
% V1.4
% Portada oficial UIB.
%------------------------------------------------
% V1.3
% Adaptat a codificació UFF-8.
%------------------------------------------------
% V1.2
% Adaptar portada a castellà i anglès.
%------------------------------------------------
% V1.1
% Adaptar als diferents estudis.
% Cada estudi un color diferent
% Grau en Enginyeria Telemàtica - Blau
% Grau en Enginyeria Informàtica - Marró
% Grau en Enginyeria Industrial - Taronja
% Grau en Enginyeria Agroalimentària - Vermell
% Grau en Edificació            - Morat
% Grau en Matemàtiques          - Verd
%------------------------------------------------

\RequirePackage{ifthen}
\RequirePackage{calc}
\AtEndOfClass{\RequirePackage[kerning,spacing,babel]{microtype}}

\DeclareOption{english}{%
	\AtEndOfClass{%
		\main@language{english}%
		\addto\captionsenglish{%
			\def\nomprojecte{Final Degree Report}%
			\def\autorsingular{Author}%
			\def\autorplural{Authors}%
			\def\supervisorsingular{Supervisor}%
			\def\supervisorplural{Supervisors}%
			\def\tutorsingular{Tutor}%
			\def\tutorplural{Tutors}%
			\def\nomparaulesclau{Keywords}%
	}}}
\DeclareOption{spanish}{%
	\AtEndOfClass{%
		\main@language{spanish}%
		\addto\captionsspanish{%
			\def\nomprojecte{Laboratio de Proyectos Software}%
			\def\autorsingular{Autor}%
			\def\autorplural{Autores}%
			\def\supervisorsingular{Supervisor}%
			\def\supervisorplural{Supervisores}%
			\def\tutorsingular{Tutor/Tutora}%
			\def\tutorplural{Tutores/Tutoras}%
			\def\nomparaulesclau{Palabras clave}%
	}}}
\DeclareOption{catalan}{%
	\AtEndOfClass{%
		\main@language{catalan}%
		\addto\captionscatalan{%
			\def\nomprojecte{Laboratori de projectes Software}%
			\def\autorsingular{Autor}%
			\def\autorplural{Autors}%
			\def\supervisorsingular{Supervisor}%
			\def\supervisorplural{Supervisors}%
			\def\tutorsingular{Tutor/Tutora}%
			\def\tutorplural{Tutors/Tutores}%
			\def\contentsname{Sumari}%
			\def\nomparaulesclau{Paraules clau}%
	}}}

% Definim aquí estudis per poder adoptar
% el nom a partir d'una opcio.
\makeatletter
\newcommand{\estudis}[1]{%
\gdef\estudis@eps{#1}}
\newcommand{\estudis@eps}{}
\makeatother

\DeclareOption{GTEL}%
{\AtEndOfClass{%
 \definecolor{colorTFG}{RGB}{79,129,189}%blau
 \estudis{Grau d'Enginyeria Telem\`atica}
}}
\DeclareOption{GEDI}%
{\AtEndOfClass{%
 \definecolor{colorTFG}{RGB}{200,91,145}%morat
 \estudis{Grau d'Enginyeria d'Edificaci\'o}
}}
\DeclareOption{GMAT}%
{\AtEndOfClass{%
 \definecolor{colorTFG}{RGB}{91,200,145}%verd
 \estudis{Grau de Matem\`atiques}
}}
\DeclareOption{GELE}%
{\AtEndOfClass{%
 \definecolor{colorTFG}{RGB}{255,153,51}%taronja
 \estudis{Grau d'Enginyeria Electr\`onica Industrial i Autom\`atica}
}}
\DeclareOption{GINF}%
{\AtEndOfClass{%
 \definecolor{colorTFG}{RGB}{153,0,0}%marro
 \estudis{Grau d'Enginyeria Inform\`atica}
}}
\DeclareOption{GAGR}%
{\AtEndOfClass{%
 \definecolor{colorTFG}{RGB}{255,82,82}%vermell
 \estudis{Grau en Enginyeria Agroaliment\`aria i del Medi Rural}
}}

%---Opcions per defecte:
\ExecuteOptions{GTEL,catalan}

\DeclareOption*{\PassOptionsToClass{\CurrentOption}{memoir}}
\ProcessOptions*

%
% Les opcions per defecte de memoir son
% 'final', 'openrigth', 'twoside', 'onecolumn'
% per tant no cal carregar-les ni especificar-les 
% en el document original
% Es carrega amb 'a4paper' i '11pt' perque per
% defecte usa 'letter' i '10pt'.
%
\LoadClass[a4paper,11pt]{memoir}

% El paquet xcolor es necessari per definir els
% colors de la memoria
\RequirePackage[table]{xcolor}
% Si es vol canviar el color de la portada i fons
% dels nombres de capitol, basta amb redefinir
% el color 'colorTFG'.
\definecolor{colorTFG}{RGB}{79,129,189}

% El paquet eso-pic es necessari per 
% construir la portada
\RequirePackage[texcoord]{eso-pic}

% Com a minim necessari pel titol de capitol
\RequirePackage{graphicx}

% El tipus de lletra serà Fourier, però el
% nombre de capítol serà lm
\RequirePackage[T1]{fontenc}
\RequirePackage[utf8]{inputenc}
\RequirePackage{lmodern}
\RequirePackage{soul,fourier}
\RequirePackage{amssymb}
\RequirePackage{multirow}

% Per defecte suposarem que l'idioma és el català
\RequirePackage[english,spanish,main=catalan]{babel}

%----------------------- daleif1 style ----------------------------------------
\makeatletter
\newlength\dlf@normtxtw
\setlength\dlf@normtxtw{\textwidth}
\def\myhelvetfont{\def\sfdefault{mdput}}
\newsavebox{\feline@chapter}
\newcommand\feline@chapter@marker[1][4cm]{%
	\sbox\feline@chapter{%
		\resizebox{!}{#1}{\fboxsep=1pt%
			\colorbox{colorTFG}{\color{white}\bfseries\sffamily\thechapter}%
		}}%
	\rotatebox{90}{%
		\resizebox{%
			\heightof{\usebox{\feline@chapter}}+\depthof{\usebox{\feline@chapter}}}%
			{!}{\scshape\color{colorTFG}\so\@chapapp}}\quad%
	\raisebox{\depthof{\usebox{\feline@chapter}}}{\usebox{\feline@chapter}}%
}
\newcommand\feline@chm[1][4cm]{%
	\sbox\feline@chapter{\feline@chapter@marker[#1]}%
	\makebox[0pt][l]{% aka \rlap
		\makebox[1cm][r]{\usebox\feline@chapter}%
	}} 
\makechapterstyle{daleif1}{
	\renewcommand\chapnamefont{\normalfont\Large\scshape\raggedleft\so}
	\renewcommand\chaptitlefont{\normalfont\huge\bfseries\scshape\color{colorTFG}}
	\renewcommand\chapternamenum{}
	\renewcommand\printchaptername{}
	\renewcommand\printchapternum{\null\hfill\feline@chm[2.5cm]\par}
	\renewcommand\afterchapternum{\par\vskip\midchapskip}
	\renewcommand\printchaptertitle[1]{\chaptitlefont\raggedleft ##1\par}
} 
\makeatother
\chapterstyle{daleif1}

\newcommand{\PreserveBackslash}[1]{\let\temp=\\#1\let\\=\temp}
\let\PBS=\PreserveBackslash

%---------------------------------------------------------------
\definecolor{Dark}{gray}{.2}
\definecolor{Medium}{gray}{.6}
\definecolor{Light}{gray}{.8}

%---------------------- DEDICATORIA ENVIRONMENT---------------
\newenvironment{agraiments}
{
  \vspace*{5cm}
  \begin{flushright}
}
{
  \end{flushright}
  \cleardoublepage
}

%-------------------- Permisos publicació -----------

\newif\ifautor
\autortrue
\newif\iftutor
\tutortrue

\newcommand{\autorsi}{%
	\ifautor
		\makebox[0pt][l]{\raisebox{0.15ex}{\hspace{0.1em}$\checkmark$}}%
	\fi
	$\square$%
}
\newcommand{\autorno}{%
	\ifautor\else
		\makebox[0pt][l]{\raisebox{0.15ex}{\hspace{0.1em}$\checkmark$}}%
	\fi
	$\square$%
}
\newcommand{\tutorsi}{%
	\iftutor
		\makebox[0pt][l]{\raisebox{0.15ex}{\hspace{0.1em}$\checkmark$}}%
	\fi
	$\square$%
}
\newcommand{\tutorno}{%
	\iftutor\else
		\makebox[0pt][l]{\raisebox{0.15ex}{\hspace{0.1em}$\checkmark$}}%
	\fi
	$\square$%
}

%-----------------------------------

\makeatletter
\newcommand{\tutor}[1]{\gdef\@tutor{#1}}%
\newcommand{\@tutor}{\@latex@warning@no@line{No \noexpand\tutor given}}

\newcommand{\paraulesclau}[1]{%
\gdef\@paraulesclau{#1}}
\newcommand{\@paraulesclau}{}
\makeatother

%---------------------------- PORTADA -------------------------

\makeatletter
\newcommand{\portada}{%
%\cleardoublepage assegura que la portada correspon a una
%pagina dreta
  \cleardoublepage
%\null forca la creació de la pagina sense text,
%ja que tota la informació s'afegira amb la comanda
%\AddToShipoutPictureBG* 
  \null
  \thispagestyle{empty}
%\makeatletter
\AddToShipoutPictureBG*{
	\setlength\unitlength{1mm}%
    \AtPageUpperLeft{%
%    	\grid
		\put(24,-14){\makebox(0,0)[lt]{%
			\includegraphics[height=21mm]{chapters/images/uib/escut-uib-horitzontal}%
			}% Fi de makebox
		}% Fi de put
       	\put(33,-60){\makebox(0,0)[lt]{\LARGE\sffamily\bfseries\textcolor{colorTFG}{\MakeUppercase{\nomprojecte}}}}
		\put(185,-93){%
			\makebox(0,0)[rt]{%
				\parbox{115mm}{%
					\raggedleft\LARGE\sffamily\bfseries\MakeUppercase{\@title}
				}% Fi de parbox
			}% Fi de makebox
		}% Fi de put
		\put(33,-150){%
			\makebox(0,0)[lb]{%
					\LARGE\sffamily\bfseries{\@author}
			}% Fi de makebox
		}% Fi de put
		\put(33,-165){%
			\makebox(0,0)[lb]{%
					\large\sffamily\bfseries\textcolor{colorTFG}{\estudis@eps}
			}% Fi de makebox
		}% Fi de put
		\put(33,-175){%
			\makebox(0,0)[lb]{%
					\large\sffamily\bfseries{Escola Politècnica Superior}
			}% Fi de makebox
		}% Fi de put
		\put(33,-200){%
			\makebox(0,0)[lb]{%
					\sffamily\bfseries{\@date}
			}% Fi de makebox
		}% Fi de put
	}% Fi de AtPageUpperLeft
}% Fi de AddToShipoutPictureBG  
}%Fi portada

\newcommand{\portadainterior}{%
%\cleardoublepage assegura que la portada correspon a una
%pagina dreta
  \cleardoublepage
%\null forca la creació de la pagina sense text,
%ja que tota la informació s'afegira amb la comanda
%\AddToShipoutPictureBG* 
  \null
  \thispagestyle{empty}
%\makeatletter
\AddToShipoutPictureBG*{
	\setlength\unitlength{1mm}%
    \AtPageUpperLeft{%
%    	\grid
		\put(35,-50){\makebox(0,0)[lt]{%
				\parbox{145mm}{%
					\raggedright\LARGE\sffamily\bfseries\MakeUppercase{\@title}
				}% Fi de parbox
			}% Fi de makebox
		}% Fi de put
		\put(35,-100){%
			\makebox(0,0)[lb]{%
					\LARGE\sffamily\bfseries{\@author}
			}% Fi de makebox
		}% Fi de put
		\put(35,-115){%
			\makebox(0,0)[lb]{%
					{\Large\sffamily\bfseries\nomprojecte}
			}% Fi de makebox
		}% Fi de put
		\put(35,-127){%
			\makebox(0,0)[lb]{%
					\Large\sffamily\bfseries{Escola Politècnica Superior}
			}% Fi de makebox
		}% Fi de put
		\put(35,-140){%
			\makebox(0,0)[lb]{%
					\Large\sffamily\bfseries{Universitat de les Illes Balears}
			}% Fi de makebox
		}% Fi de put
		\put(35,-151){%
			\makebox(0,0)[lb]{%
					\sffamily\bfseries{\@date}
			}% Fi de makebox
		}% Fi de put
		\put(35,-170){%
			\makebox(0,0)[lb]{%
					\sffamily{Paraules clau del treball: \@paraulesclau}
			}% Fi de makebox
		}% Fi de put
		\put(35,-208){%
			\makebox(0,0)[lb]{%
					\large\sffamily\emph{Tutor: \@tutor}
			}% Fi de makebox
		}% Fi de put
		% \put(35,-235){%
		% 	\makebox(0,0)[lt]{\sffamily%
		% 		\begin{tabular}{lcc|cc}
		% 		\multirow{3}{*}{\parbox{110mm}{\raggedright Autoritz la Universitat a incloure aquest treball en el repositori institucional per consultar-lo en accés obert i difondre'l en línia, amb finalitats exclusivament acadèmiques i d'investigació}} & \multicolumn{2}{c|}{Autor/a} & \multicolumn{2}{c}{Tutor/a}\\
		% 		& Sí & No & Sí & No\\ & \autorsi & \autorno & \tutorsi & \tutorno
		% 		\end{tabular}
		% 	}% Fi de makebox
		% }% Fi de put
	}% Fi de AtPageUpperLeft
}% Fi de AddToShipoutPictureBG  
}%Fi portadainterior
\makeatother

%---Format pagines interiors-----------
%\stockaiv
\settrims{0pt}{0pt}
\setulmarginsandblock{120pt}{90pt}{*}
\setlrmarginsandblock{90pt}{120pt}{*}
\checkandfixthelayout

%---El sumari mostrara fins a les subseccions----
\settocdepth{subsection}
\maxtocdepth{subsection}
\maxsecnumdepth{subsection}

