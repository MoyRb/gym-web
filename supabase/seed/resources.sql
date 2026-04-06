insert into public.resources (title, description, category, file_url, is_active)
values
  ('Guía de Nutrición para Hipertrofia', 'Todo lo que necesitas saber sobre calorías, macros y timing nutricional para ganar masa muscular.', 'nutricion', '/pdfs/rutina-base.pdf', true),
  ('Plan de Déficit Calórico Inteligente', 'Estrategias prácticas para crear un déficit calórico sin perder músculo ni rendimiento.', 'nutricion', '/pdfs/rutina-base.pdf', true),
  ('Técnica Perfecta: Los 5 Básicos', 'Instrucciones para sentadilla, press, peso muerto, dominadas y remo.', 'entrenamiento', '/pdfs/rutina-base.pdf', true),
  ('Rutina de Movilidad Articular', 'Secuencia de 15 minutos para mejorar movilidad y prevenir lesiones.', 'recuperacion', '/pdfs/rutina-base.pdf', true),
  ('Mentalidad del Atleta', 'Técnicas de psicología deportiva para mantener la motivación.', 'motivacion', '/pdfs/rutina-base.pdf', true),
  ('Optimiza tu Sueño y Recuperación', 'Protocolos de sueño y recuperación activa post-entreno.', 'recuperacion', '/pdfs/rutina-base.pdf', true)
on conflict do nothing;
