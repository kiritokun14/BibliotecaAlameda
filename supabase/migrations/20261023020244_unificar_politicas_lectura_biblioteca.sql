ALTER POLICY "lectura_publicada_Contenido" ON public."Contenido" TO anon;
ALTER POLICY "lectura_autor_Contenido" ON public."Contenido" USING ((SELECT auth.uid()) = "creadoPor" OR (estado = 'publicado' AND "autorizadoPor" IS NOT NULL));
ALTER POLICY "lectura_publicada_resena" ON public."resena" TO anon;
ALTER POLICY "lectura_autor_resena" ON public."resena" USING ((SELECT auth.uid()) = "creadoPor" OR (estado = 'publicada' AND EXISTS (SELECT 1 FROM public."Contenido" c WHERE c.id = "contenidoId" AND c.estado = 'publicado')));
ALTER POLICY "lectura_publicada_temaForo" ON public."temaForo" TO anon;
ALTER POLICY "lectura_autor_temaForo" ON public."temaForo" USING ((SELECT auth.uid()) = "creadoPor" OR ("estadoModeracion" = 'publicado'));
ALTER POLICY "lectura_publicada_comentarioForo" ON public."comentarioForo" TO anon;
ALTER POLICY "lectura_autor_comentarioForo" ON public."comentarioForo" USING ((SELECT auth.uid()) = "creadoPor" OR ("estadoModeracion" = 'publicado' AND EXISTS (SELECT 1 FROM public."temaForo" t WHERE t."temaId" = "comentarioForo"."temaId" AND t."estadoModeracion" = 'publicado')));
