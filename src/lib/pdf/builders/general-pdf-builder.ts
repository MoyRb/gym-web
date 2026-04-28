import type { ResourceSeed } from "../resources-content/base-resources"
import type { PdfResourceContent } from "../types"

type SpecificGeneralContent = Pick<PdfResourceContent, "objective" | "sections" | "recommendations">

const SPECIFIC_GENERAL_CONTENT: Record<string, SpecificGeneralContent> = {
  "calentamiento-general-10-minutos": {
    objective: "Entrar al primer ejercicio con pulso activo, articulaciones listas y técnica estable.",
    sections: [
      {
        heading: "Bloques cronometrados (10:00)",
        body: [
          "00:00-02:00 · Caminata rápida o remo suave + respiración nasal.",
          "02:00-05:00 · Movilidad dinámica: tobillo en pared x8/lado, 90/90 x6/lado, extensión torácica x8.",
          "05:00-08:00 · Activación: puente de glúteo x12, bird-dog x6/lado, wall slides x10 (2 rondas).",
          "08:00-10:00 · Series de aproximación del primer básico: 45% x8 y 65% x5.",
        ],
        checklist: ["Llegas sudando leve, no fatigado.", "Sentadilla o press salen fluidos en el primer set.", "Sin dolor agudo en cadera, hombro o lumbar."],
      },
      {
        heading: "Errores frecuentes",
        body: ["Hacer saltos o burpees al máximo antes de fuerza.", "Ir directo al peso de trabajo sin aproximaciones."],
      },
    ],
    recommendations: ["Ajusta los últimos 2 minutos al patrón principal del día.", "Si entrenas temprano, extiende 2 minutos la fase aeróbica inicial."],
  },
  "activacion-dia-de-pierna": {
    objective: "Activar cadera, tobillo y glúteo para mejorar estabilidad de rodilla en sentadilla y prensa.",
    sections: [
      {
        heading: "Secuencia previa a pierna (9-12 min)",
        body: [
          "Movilidad: dorsiflexión en pared 2x10/lado + aductor rock-back 2x8/lado.",
          "Activación glúteo: monster walk 2x12 pasos + puente con banda 2x12.",
          "Integración: sentadilla goblet 2x8 con pausa de 2 segundos abajo.",
        ],
        checklist: ["Rodilla no colapsa hacia adentro.", "Sientes glúteo en la subida.", "Ganas profundidad sin perder tronco."],
      },
      { heading: "Antes de la serie pesada", body: ["Haz dos aproximaciones (50% x6 y 70% x3) enfocando tempo controlado."] },
    ],
    recommendations: ["Si hay rigidez de tobillo, añade 1 serie extra de dorsiflexión.", "Evita estirar pasivo largo justo antes de cargar."],
  },
  "activacion-hombro-escapulas": {
    objective: "Preparar escápulas y manguito rotador para press, remos y dominadas sin pinzamientos.",
    sections: [
      {
        heading: "Circuito de activación (7-10 min)",
        body: [
          "Ronda 1: band pull-apart x15, face pull x12, rotación externa x12/lado.",
          "Ronda 2: wall slide x10, scap push-up x10, press mancuernas ligero x8.",
          "Final: 1 serie de jalón técnico x10 con pausa escapular.",
        ],
        checklist: ["No aparece dolor al elevar brazos.", "Sientes control de escápulas al empujar.", "Cuello relajado durante las repeticiones."],
      },
      { heading: "Errores comunes", body: ["Encoger hombros en todos los ejercicios.", "Usar banda muy pesada y perder rango."], checklist: ["Hombros lejos de orejas.", "Movimiento lento en la fase excéntrica."] },
    ],
    recommendations: ["En días de push pesado repite solo la ronda 1 entre series de calentamiento.", "Si hubo molestia previa, reduce volumen de press por encima de la cabeza."],
  },
  "warmup-expres-6-minutos": {
    objective: "Calentar rápido cuando tienes poco tiempo sin sacrificar seguridad del primer bloque.",
    sections: [
      {
        heading: "Formato 4 bloques x 90 segundos",
        body: [
          "Bloque 1: jumping jacks suaves + marchas altas.",
          "Bloque 2: bisagra de cadera, estocada atrás alternada, reach torácico.",
          "Bloque 3: plancha alta con toque de hombro + sentadilla aérea.",
          "Bloque 4: 1-2 series de aproximación del ejercicio principal.",
        ],
        checklist: ["Pulso en ascenso controlado.", "Respiración estable por nariz y boca.", "Primer set se siente coordinado."],
      },
      { heading: "Cuándo usarlo", body: ["Sesiones cortas de 30-40 minutos o días de agenda ajustada."], checklist: ["No usar si vienes de muchas horas sentado y rígido."] },
    ],
    recommendations: ["Si entrenas pierna pesada, conviértelo en 8 minutos.", "No sustituyas con estiramientos estáticos largos."],
  },
  "series-de-aproximacion-basicos": {
    objective: "Planificar aproximaciones eficientes para sentadilla, banca y peso muerto sin fatiga previa.",
    sections: [
      {
        heading: "Plantilla por porcentaje",
        body: [
          "Si tu serie de trabajo es 100 kg x5: 40 kg x8, 60 kg x5, 75 kg x3, 85 kg x1-2.",
          "Descansos de 45-90 segundos en aproximaciones; reserva descansos largos para trabajo real.",
          "Cuanto más pesado sea el día, más pequeños los saltos finales.",
        ],
        checklist: ["Nunca llegar al fallo en aproximación.", "La última aproximación debe sentirse rápida.", "Mantén exactamente la técnica de competencia."],
      },
      { heading: "Ajuste por sensaciones", body: ["Si la barra se siente lenta, repite el mismo peso una vez antes de subir."] },
    ],
    recommendations: ["Escribe tus aproximaciones junto al plan semanal para no improvisar.", "En accesorios basta con 0-1 serie de entrada."],
  },
  "movilidad-cadera-tobillo": {
    objective: "Mejorar dorsiflexión y rotación de cadera para sentadilla profunda y zancadas estables.",
    sections: [
      {
        heading: "Rutina concreta (12 min)",
        body: [
          "1) Tobillo en pared 3x8/lado (pausa 2 s).",
          "2) 90/90 con inclinación 2x6/lado.",
          "3) Cossack squat asistida 2x6/lado.",
          "4) Sentadilla goblet ligera 2x8 transfiriendo el nuevo rango.",
        ],
        checklist: ["Talón siempre apoyado.", "Rodilla sigue la línea del pie.", "No hay pinzazo en la parte frontal de cadera."],
      },
      { heading: "Errores comunes", body: ["Rebotar para ganar rango.", "No transferir movilidad al patrón cargado."], checklist: ["Respira al final de cada repetición."] },
    ],
    recommendations: ["Hazla 4-5 veces por semana por 3 semanas y reevalúa profundidad.", "Si hay dolor punzante, reduce rango y consulta profesional."],
  },
  "movilidad-toracica-torso": {
    objective: "Recuperar extensión y rotación torácica para mejorar postura en press y remos.",
    sections: [
      { heading: "Secuencia torácica (8-10 min)", body: ["Extensión sobre foam roller 2x8.", "Open books 2x6/lado.", "Thread the needle 2x8/lado.", "Face pull técnico 2x12 para integrar."], checklist: ["Evita compensar con hiperextensión lumbar.", "Mantén pelvis estable durante rotaciones."] },
      { heading: "Aplicación en entrenamiento", body: ["Haz 1 serie de remo con pausa escapular antes de tus series efectivas de torso."] },
    ],
    recommendations: ["Úsala antes de sesiones de espalda o pecho.", "Si trabajas muchas horas sentado, añade una micro-rutina de 3 minutos al mediodía."],
  },
  "movilidad-hombro-press": {
    objective: "Ganar movilidad útil de hombro y control escapular para press vertical y banca inclinada.",
    sections: [
      { heading: "Protocolo pre-press", body: ["Deslizamiento en pared 2x10.", "Pase de banda amplio 2x8.", "Press en medio arrodillado con mancuerna ligera 2x8/lado."], checklist: ["Costillas abajo al elevar brazo.", "No compensar arqueando la espalda.", "Agarre neutro si hay molestia inicial."] },
      { heading: "Chequeo rápido", body: ["Si no puedes mantener brazo alineado con oreja sin dolor, reduce carga y rango esa sesión."] },
    ],
    recommendations: ["Inserta una serie técnica entre calentamiento y primeras series pesadas.", "Combina con trabajo de espalda alta 2 veces por semana."],
  },
  "movilidad-post-fuerza": {
    objective: "Bajar pulsaciones y recuperar rango activo tras sesiones pesadas de fuerza.",
    sections: [
      { heading: "Vuelta a la calma (8 min)", body: ["2 min caminata suave.", "Respiración 90/90 por 2 min.", "Estiramiento dinámico de flexores de cadera 2x30 s/lado.", "Rotación torácica controlada 2x6/lado."], checklist: ["Frecuencia cardíaca desciende progresivamente.", "Lumbar y cadera con menos rigidez al terminar."] },
      { heading: "Si hubo carga alta de pierna", body: ["Añade movilidad de tobillo y aductor en bloque final (2 minutos extra)."] },
    ],
    recommendations: ["No conviertas este bloque en sesión intensa.", "Hidrátate dentro de la primera hora post entrenamiento."],
  },
  "movilidad-diaria-12-minutos": {
    objective: "Mantener articulaciones móviles en días sin entrenamiento principal.",
    sections: [
      { heading: "Rutina diaria sin material", body: ["Min 0-3: gato-camello + rotación torácica.", "Min 3-6: estocada con alcance por encima de cabeza.", "Min 6-9: sentadilla profunda asistida con respiración.", "Min 9-12: puente unilateral alternado + movilidad de tobillo."], checklist: ["Movimientos lentos, sin rebotes.", "Respiración nasal siempre que sea posible."] },
      { heading: "Cuándo hacerla", body: ["Al despertar o al finalizar jornada laboral para reducir rigidez acumulada."] },
    ],
    recommendations: ["Hazla al menos 5 días a la semana para notar cambios estables.", "Combínala con caminata ligera de 15-20 minutos."],
  },
  "cardio-por-zonas-principiantes": {
    objective: "Usar zonas de esfuerzo para progresar en cardio sin pasar todo el tiempo en alta intensidad.",
    sections: [
      { heading: "Semana base (3 sesiones)", body: ["Sesión A: 30 min en RPE 5.", "Sesión B: 35 min en RPE 6 con 5 min finales suaves.", "Sesión C: 8 intervalos de 1 min RPE 8 / 1 min RPE 3."], checklist: ["Puedes completar la semana sin fatiga excesiva.", "No cae tu rendimiento en días de fuerza."] },
      { heading: "Progresión", body: ["Suma 5 minutos totales por semana durante 3 semanas y realiza 1 semana de descarga reduciendo 20%."] },
    ],
    recommendations: ["Si eres totalmente novato, empieza con 2 sesiones.", "Mantén un registro simple de RPE y minutos totales."],
  },
  "intervalos-controlados-bicicleta": {
    objective: "Mejorar capacidad aeróbica y tolerancia al esfuerzo con intervalos medibles en bicicleta.",
    sections: [
      { heading: "Protocolo principal", body: ["Calentamiento 8 min subiendo de RPE 3 a 6.", "Bloque A: 10x (60 s fuerte RPE 8 + 60 s suave RPE 3).", "Bloque B alternativo: 6x (75 s fuerte + 150 s suave).", "Enfriamiento 5 min + respiración 2 min."], checklist: ["Cadencia objetivo 90-105 rpm en tramos fuertes.", "No perder más de 10 rpm en las últimas repeticiones.", "Poder hablar frases cortas durante recuperaciones."], },
      { heading: "Progresión de 4 semanas", body: ["Semana 1: 8 repeticiones.", "Semana 2: 9 repeticiones.", "Semana 3: 10 repeticiones.", "Semana 4: 6 repeticiones a misma intensidad para descargar."], },
    ],
    recommendations: ["Mantén un día completo sin intervalos intensos después de esta sesión.", "Si usas potenciómetro, busca consistencia de potencia antes de subir carga."],
  },
  "guia-caminata-inclinada": {
    objective: "Aumentar gasto energético con bajo impacto usando caminata en inclinación.",
    sections: [
      { heading: "Parámetros sugeridos", body: ["Principiante: 15-20 min, inclinación 5-7%, velocidad 4.5-5.2 km/h.", "Intermedio: 25-35 min, inclinación 8-12%, velocidad 5-5.8 km/h.", "RPE objetivo entre 6 y 7 para sostener técnica de marcha."], checklist: ["Postura alta sin agarrarte del panel.", "Paso corto y estable.", "Respiración controlada durante toda la sesión."] },
      { heading: "Integración semanal", body: ["Ubícala en días de torso o como sesión separada en la mañana para no comprometer pierna pesada."] },
    ],
    recommendations: ["Sube primero minutos y luego inclinación.", "Si hay molestias de pantorrilla, baja inclinación 1-2 niveles temporalmente."],
  },
  "cardio-mixto-semanal": {
    objective: "Combinar continuo e intervalos para mejorar resistencia general sin interferir con fuerza.",
    sections: [
      { heading: "Ejemplo 4 sesiones", body: ["Lunes: 35 min zona moderada (RPE 6).", "Miércoles: 10x1:1 en bicicleta (RPE 8 en trabajo).", "Viernes: caminata inclinada 25 min (RPE 6).", "Sábado: continuo largo 45 min (RPE 5)."], checklist: ["No colocar intervalos el día posterior a sentadilla pesada.", "Dormir 7+ horas antes de sesión intensa."] },
      { heading: "Ajustes por fatiga", body: ["Si piernas pesadas >48h, cambia intervalos por 25 min suaves y retoma la semana siguiente."] },
    ],
    recommendations: ["En déficit calórico conserva solo 1 sesión dura por semana.", "Cada 5 semanas reduce volumen total 20%."],
  },
  "rpe-aplicado-a-cardio": {
    objective: "Usar la escala RPE para regular intensidad cuando no tienes monitor de frecuencia cardíaca.",
    sections: [
      { heading: "Tabla rápida", body: ["RPE 4: conversación completa, trabajo regenerativo.", "RPE 6: conversación entrecortada, zona moderada productiva.", "RPE 8: frases cortas, intervalos exigentes y breves."], checklist: ["Anota RPE al finalizar cada bloque.", "Compara RPE con ritmo/velocidad para medir progreso."] },
      { heading: "Aplicación práctica", body: ["Sesión continua: mantén RPE 5-6.", "Sesión por intervalos: alterna RPE 8 y RPE 3-4 en recuperaciones."] },
    ],
    recommendations: ["Si dos sesiones seguidas suben 1-2 puntos de RPE al mismo ritmo, baja carga semanal.", "Combina RPE con prueba de habla para mayor precisión."],
  },
  "nutricion-basica-para-entrenar": {
    objective: "Construir una alimentación práctica para rendir en el gym sin planes complejos.",
    sections: [
      { heading: "Estructura simple de comidas", body: ["Cada comida: 1 porción de proteína + 1 de carbohidrato + verduras + grasa moderada.", "Pre entreno (60-90 min): yogur con fruta o sándwich ligero.", "Post entreno: 25-40 g de proteína + carbohidrato fácil de digerir."], checklist: ["Proteína total diaria entre 1.6 y 2.2 g/kg.", "Incluye frutas/verduras en al menos 3 momentos.", "No entrenar deshidratado."], },
      { heading: "Hidratación base", body: ["Objetivo diario: 30-40 ml/kg de agua.", "Añade 500-750 ml extra en sesiones largas o con calor."] },
    ],
    recommendations: ["Prioriza consistencia semanal sobre perfección diaria.", "Evita saltarte comidas clave antes de entrenar pesado."],
  },
  "proteina-diaria-personas-activas": {
    objective: "Asegurar proteína suficiente y bien distribuida para recuperar y progresar.",
    sections: [
      { heading: "Cuánto y cómo repartir", body: ["Rango sugerido: 1.6-2.2 g/kg/día.", "Divide en 3-5 tomas de 25-45 g según peso corporal.", "Añade una toma cercana al entrenamiento."], checklist: ["Cada comida incluye fuente principal (huevo, lácteos, carne, legumbres o whey).", "No concentrar toda la proteína en una sola comida."] },
      { heading: "Fuentes prácticas", body: ["Desayuno: yogur griego + avena.", "Comida: pollo, atún o tofu con arroz.", "Cena: huevo + legumbres + verduras."], },
    ],
    recommendations: ["Si te cuesta llegar al objetivo, utiliza colación proteica sencilla.", "Revisa tolerancia digestiva y reparte mejor en porciones menores."],
  },
  "colaciones-pre-post-entrenamiento": {
    objective: "Elegir snacks pre y post entreno según horario para mejorar energía y recuperación.",
    sections: [
      { heading: "Antes de entrenar", body: ["Si faltan 60-90 min: tostada con pavo + fruta.", "Si faltan 30 min: banana + yogur bebible o bebida isotónica.", "Evita grasas altas y fibra excesiva justo antes de intervalos o pierna."], checklist: ["Llegar con energía estable, sin pesadez.", "Mantener hidratación ligera en la hora previa."] },
      { heading: "Después de entrenar", body: ["Dentro de 2 horas: comida con proteína completa y carbohidrato.", "Ejemplo rápido: leche + cereal + fruta o arroz con huevo y verduras."], },
    ],
    recommendations: ["Prueba 2-3 combinaciones y quédate con la que mejor te siente.", "Planifica colaciones la noche anterior para evitar improvisación."],
  },
  "hidratacion-entrenamientos-gimnasio": {
    objective: "Mantener rendimiento y concentración mediante una hidratación adecuada antes, durante y después.",
    sections: [
      { heading: "Protocolo de hidratación", body: ["2 horas antes: 400-600 ml de agua.", "Durante: 150-250 ml cada 15-20 min en sesiones largas.", "Después: repón 500-750 ml y añade sodio si sudaste mucho."], checklist: ["Orina color amarillo claro durante el día.", "No terminar sesión con dolor de cabeza o mareo.", "Peso corporal no baja más de 1-2% tras entrenar."], },
      { heading: "Cuándo usar electrolitos", body: ["Entrenamientos >60 min, ambientes calurosos o sudoración alta."], },
    ],
    recommendations: ["Lleva botella marcada por volumen para controlar ingesta.", "En días de cardio intenso aumenta líquidos desde la mañana."],
  },
  "organizacion-semanal-comidas": {
    objective: "Ordenar compras y preparación semanal para sostener adherencia nutricional.",
    sections: [
      { heading: "Método 2+2+2", body: ["Elige 2 proteínas base, 2 carbohidratos y 2 guarniciones de verduras para toda la semana.", "Cocina en lote 2 veces: domingo y miércoles.", "Deja listas 3 colaciones portátiles para días de oficina."], checklist: ["Lista de compras cerrada antes de ir al súper.", "Porciones listas para al menos 3 días.", "Plan B congelado para días sin tiempo."], },
      { heading: "Ejemplo simple", body: ["Proteínas: pollo + legumbres.", "Carbohidratos: arroz + papa.", "Verduras: ensalada mixta + salteado."], },
    ],
    recommendations: ["No planifiques menú perfecto, planifica menú repetible.", "Reserva 20 minutos semanales para ajustar cantidades según hambre y progreso."],
  },
  "recuperacion-post-entreno": {
    objective: "Acelerar recuperación de las primeras 24 horas para sostener rendimiento semanal.",
    sections: [
      { heading: "Ventanas clave", body: ["0-2 horas: hidratar y comer proteína + carbohidrato.", "2-8 horas: caminar 10-15 min y movilidad suave 6 min.", "Noche: rutina de sueño constante con 7-9 h."], checklist: ["Disminuye rigidez al día siguiente.", "Energía suficiente para siguiente sesión.", "Dolor muscular tolerable, no incapacitante."], },
      { heading: "Si la sesión fue muy demandante", body: ["Reduce volumen accesorio al día siguiente y prioriza recuperación activa."] },
    ],
    recommendations: ["No subestimes la hidratación post sesión.", "Usa respiración lenta 3-5 minutos para bajar activación."],
  },
  "sueno-y-rendimiento-fisico": {
    objective: "Mejorar el sueño para recuperar mejor, rendir más y gestionar fatiga acumulada.",
    sections: [
      { heading: "Hábitos de sueño útiles", body: ["Horario fijo con variación máxima de 45 minutos.", "Corte de pantallas brillantes 60 minutos antes de dormir.", "Última cafeína idealmente 8 horas antes de acostarte."], checklist: ["Objetivo: 7-9 horas promedio semanal.", "Despertar con energía al menos 4 de 7 días.", "Menos somnolencia en entrenamientos matutinos."], },
      { heading: "Señales de fatiga por mal descanso", body: ["Caída de rendimiento 2+ sesiones seguidas.", "RPE más alto con mismas cargas.", "Irritabilidad y baja concentración durante entreno."], },
    ],
    recommendations: ["Si acumulas 2 noches malas, reduce 20% el volumen de entrenamiento ese día.", "Exponte a luz natural por la mañana para reforzar ritmo circadiano."],
  },
  "gestion-fatiga-semanal": {
    objective: "Detectar fatiga a tiempo y ajustar carga antes de estancarte o lesionarte.",
    sections: [
      { heading: "Semáforo semanal", body: ["Verde: rendimiento estable, sueño correcto, molestias leves.", "Amarillo: RPE alto inusual + dolor persistente + mala motivación.", "Rojo: descenso claro de cargas/repeticiones y cansancio continuo."], checklist: ["Verde: sigue plan normal.", "Amarillo: recorta 1-2 series por ejercicio.", "Rojo: microdescarga de 4-7 días."], },
      { heading: "Métricas mínimas", body: ["Horas de sueño, energía matinal, RPE promedio de básicos y apetito diario."], },
    ],
    recommendations: ["Ajusta una sola variable por vez (volumen o intensidad).", "No esperes a llegar al agotamiento total para descargar."],
  },
  "deload-en-fuerza": {
    objective: "Aplicar semanas de descarga inteligentes para seguir progresando en fuerza.",
    sections: [
      { heading: "Cuándo hacer deload", body: ["Tras 4-8 semanas de carga creciente.", "Si hay dolor articular persistente o caída de rendimiento repetida.", "Si el estrés externo subió y el sueño cayó."], checklist: ["Reduce volumen 30-50%.", "Mantén técnica y velocidad de ejecución.", "Evita buscar récords esa semana."], },
      { heading: "Cómo volver al bloque", body: ["Retoma con 90-95% de la carga previa y reconstruye progresión durante 1-2 semanas."] },
    ],
    recommendations: ["Deload no es retroceso: es inversión para el siguiente bloque.", "Mantén movilidad y caminatas para recuperarte mejor."],
  },
  "recuperacion-activa-dias-ligeros": {
    objective: "Usar días ligeros para recuperar sin perder ritmo ni hábito de movimiento.",
    sections: [
      { heading: "Sesión tipo (30-40 min)", body: ["15-20 min cardio suave (RPE 4-5).", "10 min movilidad global de cadera, hombro y torácica.", "5 min respiración diafragmática o caminata tranquila final."], checklist: ["Terminas mejor de lo que empezaste.", "No aumenta dolor articular.", "Sueño mejora esa noche."], },
      { heading: "Qué evitar", body: ["Convertir el día ligero en sesión intensa por impulsividad."] },
    ],
    recommendations: ["Ideal entre dos sesiones pesadas de fuerza.", "Mantén frecuencia, baja intensidad."],
  },
  "guia-inicio-4-semanas": {
    objective: "Dar estructura real al primer mes de gym para crear técnica, hábito y confianza.",
    sections: [
      { heading: "Plan por semanas", body: ["Semana 1: 3 sesiones full body, foco en aprender movimientos.", "Semana 2: repetir estructura y sumar 1 serie en dos ejercicios.", "Semana 3: mantener cargas y subir repeticiones dentro del rango.", "Semana 4: aumentar 2-5% en ejercicios dominados y consolidar rutina."], checklist: ["Asistencia mínima: 10 de 12 sesiones.", "Registro de cargas en cada entrenamiento.", "Sin dolor agudo en patrones básicos."], },
      { heading: "Distribución semanal sugerida", body: ["Lunes, miércoles y viernes para facilitar recuperación.", "Martes/jueves: caminata y movilidad breve."], },
    ],
    recommendations: ["No cambies rutina cada semana.", "Prioriza aprender técnica antes de perseguir pesos altos."],
  },
  "errores-comunes-al-empezar": {
    objective: "Evitar fallos típicos de principiantes que frenan progreso en los primeros meses.",
    sections: [
      { heading: "Top 6 errores", body: ["Subir peso cada sesión sin dominar técnica.", "Copiar rutinas avanzadas de 6 días.", "Ir al fallo en todos los ejercicios.", "No descansar entre series lo necesario.", "No registrar entrenamientos.", "Ignorar sueño y alimentación."], checklist: ["¿Tu técnica se mantiene en todas las repeticiones?", "¿Dejas 1-3 repeticiones en reserva en básicos?", "¿Tienes un registro semanal?"], },
      { heading: "Corrección rápida", body: ["Simplifica a 3-4 sesiones, básicos bien ejecutados y progresión gradual."] },
    ],
    recommendations: ["Menos variedad, más repetición de lo importante.", "Aprende a progresar con repeticiones antes que con peso."],
  },
  "uso-basico-maquinas-gimnasio": {
    objective: "Aprender a configurar máquinas para entrenar seguro y con estímulo efectivo.",
    sections: [
      { heading: "Checklist de ajuste", body: ["Alinea eje de la máquina con tu articulación principal.", "Respaldo y asiento: permite rango completo sin compensar.", "Carga inicial: deja 2-3 repeticiones en reserva."], checklist: ["Movimiento controlado en ida y vuelta.", "Sin bloquear articulaciones al final del recorrido.", "No perder contacto con respaldo cuando corresponde."], },
      { heading: "Orden recomendado", body: ["Empieza por patrones grandes (prensa, jalón, press) y termina con aislados."] },
    ],
    recommendations: ["Pide revisión técnica en la primera semana de uso.", "Ajusta la máquina cada vez, no asumas que quedó bien del usuario anterior."],
  },
  "como-elegir-peso-correctamente": {
    objective: "Seleccionar cargas seguras y retadoras usando RIR desde la primera sesión.",
    sections: [
      { heading: "Método práctico", body: ["Haz una serie de prueba de 8-10 repeticiones.", "Si te quedan más de 4 repeticiones en reserva, sube peso.", "Si no puedes completar el rango con técnica, baja peso 5-10%."], checklist: ["Objetivo general: terminar series con RIR 1-3.", "La velocidad cae al final, pero técnica se mantiene.", "No hay dolor agudo ni compensaciones."], },
      { heading: "Cuándo subir carga", body: ["Cuando completes el rango alto en todas las series dos sesiones seguidas."] },
    ],
    recommendations: ["Es mejor progresar lento y constante que rápido e inestable.", "Grábate en básicos para validar técnica antes de subir peso."],
  },
  "primera-progresion-8-semanas": {
    objective: "Aplicar una progresión simple de 8 semanas para mejorar fuerza y consistencia.",
    sections: [
      { heading: "Bloque de 8 semanas", body: ["Semanas 1-2: adapta técnica con RIR 3.", "Semanas 3-4: suma repeticiones por serie.", "Semanas 5-6: aumenta 2-5% la carga en básicos.", "Semana 7: consolida sin forzar máximos.", "Semana 8: reduce volumen 25% y prepara siguiente bloque."], checklist: ["Registrar cargas, repeticiones y RPE cada sesión.", "Dormir 7+ horas promedio.", "Completar al menos 90% de sesiones."], },
      { heading: "Si te estancas", body: ["Revisa primero sueño, alimentación y descanso antes de cambiar todo el programa."] },
    ],
    recommendations: ["Mantén los mismos ejercicios base todo el bloque.", "Al terminar, repite esquema con pequeñas mejoras de carga inicial."],
  },
}

export function buildGeneralPdfResource(seed: ResourceSeed): PdfResourceContent {
  const specificContent = SPECIFIC_GENERAL_CONTENT[seed.slug]

  if (!specificContent) {
    return {
      slug: seed.slug,
      title: seed.title,
      category: seed.category,
      description: seed.description,
      objective: `Guía práctica para ${seed.title.toLowerCase()} con aplicación inmediata en tu semana de entrenamiento.`,
      sections: [
        {
          heading: "Aplicación práctica",
          body: [
            `Usa este recurso de ${seed.category} entre 2 y 4 veces por semana según tu planificación.`,
            `Enfócate en: ${seed.focus.join(" · ")}.`,
          ],
          checklist: ["Registra cumplimiento semanal.", "Evalúa sensaciones al finalizar.", "Ajusta una sola variable por semana."],
        },
      ],
      recommendations: ["Prioriza constancia.", "Detén cualquier ejercicio ante dolor agudo."],
    }
  }

  return {
    slug: seed.slug,
    title: seed.title,
    category: seed.category,
    description: seed.description,
    ...specificContent,
  }
}
