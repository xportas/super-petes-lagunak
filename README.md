# super-petes-lagunak
Super Manager game version for the Lagunak Senior Men's A basketball team


IDEAS:

 >> PÁGINAS:
    0. Login / Registro.
    1. Inicio
    2. Equipo: alineación para la siguiente jornada
      2.1. Ficha jugador individual
    3. Clasificación general de la Liga
    4. Ajustes --> aquí opciones de admin no visibles para rol user

-------------------------------------------------------------------

    >> LOGIN
      - username + password
      - Olvidar contraseña
      --> background image: pedir obra de arte a Keman. edit con escudo del club?? o solo edit faltoso ??
    
    >> REGISTRO
      - Integración con Google ??? (0Auth)
      - email + password (securización de pass almacenada)
      - ROLES (opciones: admin, usuario)

    >> INICIO / HOME
      - Cuenta atrás para cierre de alineaciones (para próxima jornada). --> hacer coincidir con hora partido menos 1 hora o antes del jueves para que tenga gracia el hacer alineaciones sin saber la convocatoria?
      - Próximo partido (fecha y hora, lugar y rival).
      - Clasificación general de la Liga (Top 3 usuarios con mejor valoración de la última jornada).
      - Top 3 jugadores con mayor valoración de la última jornada.
      
    >> EQUIPO: 
      - Alineación para la próxima jornada
        --> 5 jugadores + entrenador
        --> entrenadores con habilidades especiales:
            Maider: mejor del equipo puntúa x1.3
            Páter: toda la plantilla puntúa como mínimo 1 (no negativos ni 0)
        --> Norma: no se puede alinear más de 2 partidos seguidos al mismo jugador (evitamos repetir quinteto siempre, pero hay que permitir repetir dos jornadas porque no hay jugadores suficientes)
        --> Si se pone jugador lesionado --> se le quitan 5 puntos.
        --> Puntos extra si se pone jugador en su posición habitual. (5 ptos) >>>  B | E/A | AP | P
      - Carousel de jugadores para facilitar el cambio, que se pueda arrastrar y soltar.
      - Background de pista de baloncesto (personalizada con campo con escudo Lagunak ???)

    >> FICHA JUGADOR INDIVIDUAL
      - Información básica del jugador:  
        * Foto
        * Nombre
        * Dorsal
        * Posición
        * Mote
        * Descripción breve y FALTOSA
        * Estadísticas generales de la FNB (ver web FNB)
          ** Valoración media por partido
          ** Valoración de la última jornada


    >> CLASIFICACIÓN GENERAL
        - Puntos acumulados.
        - Ranking por username
        - Destacar con colores los 3 primeros puestos (oro, plata y bronce) y los 3 últimos (gradiente rojo)

    >> AJUSTES
      - Cambiar contraseña
      - Tema claro/oscuro
      - Notificaciones
      - Idioma (Castellano, Euskera, Galego RAG, Galego AGAL)
      - Cerrar sesión
      