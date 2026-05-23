# Contexto de la aplicación

## 1. Visión general

El sistema que hemos acabado construyendo es una aplicación de votación que funciona sobre
la red de Algorand y se apoya en la red de Ethereum. La aplicación se sostiene gracias a unas
entidades que alojan localmente un nodo de Algorand, sobre el que se ejecuta la red
permisionada, y que además ejecutan en paralelo un sistema de anchoring. Este sistema se
encarga de detectar en todo momento qué elecciones han finalizado, generar el hash del estado
de la red y enviarlo a un smart contract de Ethereum desplegado en la testnet de Sepolia. Esta
sería la parte de infraestructura que queda fuera del alcance del votante y de cuyo mantenimiento
no tiene que preocuparse.


## 2. Aplicación cliente: usuarios y organizaciones

### 2.1. Organizaciones y administradores

Por su parte, el votante es un usuario que deberá descargarse una aplicación web (de código
abierto) mediante la cual podrá interactuar con la red. Cualquier usuario puede crear una organización
(su nombre es único a nivel global). El usuario que la crea pasa a ser el administrador que la
gestiona y queda añadido automáticamente al censo. Los administradores son los encargados de
gestionar el censo de su organización (añadiendo o eliminando direcciones), es decir, las direcciones
públicas de las wallets que pueden interactuar con las propuestas y elecciones de esa organización.
El administrador no puede ser eliminado del censo, ya que como mínimo debe permanecer él.

### 2.2. Gestión del censo

Para facilitar la gestión de censos grandes, el cliente permite cargar direcciones de forma masiva
mediante un fichero CSV. Internamente, el cliente trocea las direcciones en lotes para enviarlas al
contrato (cada transacción admite un máximo de 7 direcciones), pero esto es totalmente transparente
para el administrador: la única consecuencia visible es que cargar censos muy grandes tarda más tiempo,
porque requiere firmar varias transacciones consecutivas.


## 3. Propuestas

### 3.1. Contenido de una propuesta

Una propuesta es el paso previo a una elección y contiene toda la información de la misma:
    - Título
    - Descripción
    - Opciones a votar (mínimo 2, sin duplicados y sin campos vacíos)
    - Organización a la que pertenece la elección
    - Fecha de inicio de la elección
    - Fecha de fin de la elección

### 3.2. Restricciones temporales

El contrato aplica algunas restricciones temporales a la creación de propuestas: la fecha de inicio
tiene que estar al menos 3 días por delante del momento de creación, y la ventana de votación (entre
inicio y fin) tiene que ser de al menos 1 día. Estos márgenes garantizan que haya tiempo suficiente
para la fase de aprobación previa y que la elección no se pueda cerrar inmediatamente.

### 3.3. Estados de una propuesta

Toda propuesta atraviesa una pequeña máquina de estados que el cliente utiliza para mostrar la
información correspondiente y habilitar o deshabilitar las acciones disponibles en cada momento.
Conviene recordar que en el smart contract de Algorand una elección solo se considera realmente
abierta cuando se cumplen DOS condiciones a la vez: quórum de 2/3 alcanzado Y fecha de inicio llegada.
Los estados siguientes son la forma que tiene el cliente de comunicar visualmente en qué momento del
ciclo está cada propuesta:

- **PendingApproval**: la propuesta está abierta a votos de aprobación; aún no se ha alcanzado el
  quórum ni la fecha de inicio.
- **Rejected**: la propuesta ha llegado a su fecha de inicio sin alcanzar el quórum de 2/3 de aprobación.
  No se podrá votar en ella.
- **PendingStart**: la propuesta ya tiene los 2/3 de votos a favor necesarios para convertirse en
  elección, pero aún no ha llegado la fecha de inicio. Es un estado visual del cliente para indicar
  que la elección está garantizada; todavía no se pueden emitir votos de preferencia (eso solo es
  posible cuando se cumplen las dos condiciones: quórum + fecha de inicio).
- **Open**: las dos condiciones se cumplen (quórum + fecha de inicio) y los miembros del censo pueden
  enviar o modificar su ranking de preferencias.
- **Closed**: la elección ha superado la fecha de fin. Ya no se admiten más votos y se pueden calcular
  los resultados finales con el método de Schulze.


## 4. Elecciones

### 4.1. De propuesta a elección

Una elección es el estado en el que entra una propuesta cuando llega a su fecha de inicio habiendo
obtenido al menos dos tercios de votos de aprobación positivos. En ese momento ya se pueden emitir
votos en los que el votante ordena, según sus preferencias, las opciones disponibles.

### 4.2. Acciones disponibles para los usuarios

Un usuario puede pertenecer a una o varias organizaciones y, a la vez, tener una o varias bajo su
gestión (siendo él el administrador). Las acciones que puede realizar un usuario dentro de una
organización a la que pertenezca son las siguientes:

- **Emitir votos de aprobación**: un voto de aprobación es un voto que solo puede tener dos valores,
a favor o en contra, y que se envía a una propuesta que aún no ha alcanzado su fecha de inicio. La
fase de aprobación se cierra 3 días antes de la fecha de inicio de la elección (no el día anterior),
para dar margen a que todos los votantes conozcan con antelación si la propuesta va a celebrarse.
Una vez emitido, el voto de aprobación no se puede modificar.
- **Emitir votos a una propuesta**: cuando la propuesta supera su fecha de inicio y, al hacer el
recuento, más de 2/3 de los votos de aprobación son a favor, se genera la "elección"; es entonces
cuando los usuarios pueden emitir su voto ordenando las opciones según sus preferencias. El votante
tiene que ordenar todas las opciones (ranking completo, no parcial) y, a diferencia del voto de
aprobación, el voto de elección sí se puede modificar mientras la elección esté abierta.

### 4.3. Cálculo de resultados (método de Schulze)

Cuando una elección finaliza, el cliente calcula el resultado final aplicando el método de Schulze:
cada votante ha expresado un orden de preferencia entre todas las opciones, y el algoritmo determina
el ganador comparando cada par de opciones entre sí (cuántos votantes prefieren A sobre B y viceversa),
resolviendo posibles ciclos mediante el método de Floyd-Warshall para obtener un ranking final inequívoco.
Todo el cómputo ocurre en el cliente a partir de las papeletas almacenadas en la blockchain de Algorand;
el contrato no guarda ningún resultado precalculado, solo las papeletas individuales.

Una vez finalizada, la elección se ancla a Ethereum mediante el sistema de anchoring descrito en el punto 6.


## 5. Verificación pública de votos

El cliente incluye un panel de verificación abierto a cualquier persona (no hace falta ser miembro del
censo). Introduciendo una dirección de wallet, la aplicación consulta directamente la blockchain de
Algorand y muestra el ranking de preferencias que esa dirección emitió en la elección, o bien indica
que esa dirección no votó. Esta funcionalidad, combinada con el anchoring posterior en Ethereum,
permite que cualquier persona pueda auditar de forma independiente tanto el voto individual como la
integridad del resultado global.


## 6. Sistema de anchoring

Cuando una elección finaliza, cada nodo ejecuta de forma independiente un proceso de anchoring que
certifica el resultado en Ethereum. El flujo es el siguiente:

### 6.1. Lectura del estado desde Algorand

El sistema lee directamente de la blockchain de Algorand las papeletas registradas para la elección:
la propuesta con su título y opciones, y el voto de preferencias completo de cada votante. Las papeletas
se ordenan por dirección del votante en orden lexicográfico para garantizar que todos los nodos obtengan
exactamente la misma representación del estado.

### 6.2. Cálculo del hash determinista

Con el estado completo de la elección se genera un JSON canónico (claves ordenadas, sin espacios) y se
calcula su SHA-256. Dado que todos los nodos leen el mismo estado de la blockchain y aplican el mismo
orden, todos producen exactamente el mismo hash si los datos no han sido manipulados.

### 6.3. Envío al smart contract de Ethereum

Cada nodo firma y envía su hash al contrato `NotaryContract` desplegado en la testnet Sepolia de Ethereum.
El contrato acumula los envíos de cada nodo y, cuando un número suficiente de ellos coincide en el mismo
hash, registra el resultado como anclado de forma permanente e inmutable.


## 7. Smart contract NotaryContract (Ethereum - Sepolia)

El `NotaryContract` es el componente que garantiza la integridad del sistema en Ethereum. Implementa
un mecanismo de consenso **K-of-N** entre los nodos universitarios:

- El administrador del contrato gestiona una lista blanca de direcciones Ethereum, una por cada nodo
  universitario participante. El umbral K se calcula automáticamente como el techo de 2/3 del total
  de nodos registrados.

- Antes de que empiece el anchoring de una elección, el administrador la abre en el contrato. En ese
  momento se congelan la lista de nodos autorizados y el umbral K vigentes; cambios posteriores en los
  miembros no afectan las elecciones ya abiertas.

- Cada nodo puede enviar su hash una única vez por elección. El contrato lleva la cuenta de cuántos
  nodos han enviado el mismo hash. En el momento en que K nodos coinciden, la elección queda marcada
  como anclada y se emite un evento permanente en la blockchain.

- Cualquier persona puede consultar en cualquier momento si una elección ha sido anclada y qué hash
  envió cada nodo, lo que permite una auditoría pública y transparente sin depender de ninguna entidad
  central.
