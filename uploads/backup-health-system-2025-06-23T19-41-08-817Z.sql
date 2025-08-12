--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

-- Started on 2025-06-23 19:41:08 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3412 (class 0 OID 81931)
-- Dependencies: 231
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.activity_logs DISABLE TRIGGER ALL;

INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (1, 9, 'Jose  Alves', 'doctor', 28, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou exame Hemograma para paciente Jean Carlos', 'exam', 'Hemograma', NULL, 'received', '2025-06-16 15:38:07.474');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (2, 9, 'Jose  Alves', 'doctor', 29, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Jean Carlos', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-16 15:45:46.372');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (3, 10, 'Luis A', 'clerk', 28, 'Jean Carlos', 'status_changed', 'Luis A aceitou exame Hemograma do paciente Jean Carlos', 'exam', 'Hemograma', 'received', 'accepted', '2025-06-16 16:00:07.094');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (4, 10, 'Luis A', 'clerk', 28, 'Jean Carlos', 'status_changed', 'Luis A confirmou exame Hemograma do paciente Jean Carlos', 'exam', 'Hemograma', 'accepted', 'confirmed', '2025-06-16 16:00:14.928');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (5, 10, 'Luis A', 'clerk', 26, 'Jean Carlos', 'status_changed', 'Luis A finalizou exame Hemograma Completo do paciente Jean Carlos', 'exam', 'Hemograma Completo', 'confirmed', 'completed', '2025-06-16 16:00:20.829');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (6, 10, 'Luis A', 'clerk', 28, 'Jean Carlos', 'status_changed', 'Luis A finalizou exame Hemograma do paciente Jean Carlos', 'exam', 'Hemograma', 'confirmed', 'completed', '2025-06-16 16:00:23.834');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (7, 6, 'Mayara Sarmento', 'secretario', 29, 'Jean Carlos', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-16 16:01:57.874');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (8, 9, 'Jose  Alves', 'doctor', 30, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Jean Carlos', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-16 16:23:12.272');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (9, 10, 'Luis A', 'clerk', 29, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A aceitou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'received', 'accepted', '2025-06-16 16:23:55.876');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (10, 10, 'Luis A', 'clerk', 29, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A confirmou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'accepted', 'confirmed', '2025-06-16 16:23:59.065');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (11, 10, 'Luis A', 'clerk', 29, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A finalizou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'confirmed', 'completed', '2025-06-16 16:24:01.47');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (12, 6, 'Mayara Sarmento', 'secretario', 30, 'Jean Carlos', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-16 16:24:37.217');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (13, 10, 'Luis A', 'clerk', 30, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A confirmou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'accepted', 'confirmed', '2025-06-16 20:24:40.224');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (14, 9, 'Jose  Alves', 'doctor', 31, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Jean Carlos', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-16 22:19:50.586');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (15, 10, 'Luis A', 'clerk', 30, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A finalizou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'confirmed', 'completed', '2025-06-16 22:20:32.278');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (16, 9, 'Jose  Alves', 'doctor', 32, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Jean Carlos', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-17 14:23:08.455');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (17, 9, 'Jose  Alves', 'doctor', 33, 'Marylia Sousa Sarmento', 'created', 'Dr. Jose  Alves cadastrou exame Hemograma Completo para paciente Marylia Sousa Sarmento', 'exam', 'Hemograma Completo', NULL, 'received', '2025-06-17 14:34:59.925');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (18, 9, 'Jose  Alves', 'doctor', 34, 'Marylia Sousa Sarmento', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Marylia Sousa Sarmento', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-17 14:35:00.116');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (19, 10, 'Luis A', 'clerk', 33, 'Marylia Sousa Sarmento', 'status_changed', 'Cadastrador Luis A aceitou exame Hemograma Completo do paciente Marylia Sousa Sarmento', 'exam', 'Hemograma Completo', 'received', 'accepted', '2025-06-17 14:38:00.576');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (20, 10, 'Luis A', 'clerk', 33, 'Marylia Sousa Sarmento', 'status_changed', 'Cadastrador Luis A confirmou exame Hemograma Completo do paciente Marylia Sousa Sarmento', 'exam', 'Hemograma Completo', 'accepted', 'confirmed', '2025-06-17 14:38:06.877');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (21, 10, 'Luis A', 'clerk', 33, 'Marylia Sousa Sarmento', 'status_changed', 'Cadastrador Luis A finalizou exame Hemograma Completo do paciente Marylia Sousa Sarmento', 'exam', 'Hemograma Completo', 'confirmed', 'completed', '2025-06-17 14:39:19.866');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (22, 9, 'Jose  Alves', 'doctor', 35, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou exame Hemograma Completo para paciente Jean Carlos', 'exam', 'Hemograma Completo', NULL, 'received', '2025-06-17 15:50:37.091');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (23, 10, 'Luis A', 'clerk', 35, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A aceitou exame Hemograma Completo do paciente Jean Carlos', 'exam', 'Hemograma Completo', 'received', 'accepted', '2025-06-17 15:50:59.209');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (24, 10, 'Luis A', 'clerk', 35, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A confirmou exame Hemograma Completo do paciente Jean Carlos', 'exam', 'Hemograma Completo', 'accepted', 'confirmed', '2025-06-17 15:52:24.47');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (25, 10, 'Luis A', 'clerk', 35, 'Jean Carlos', 'status_changed', 'Cadastrador Luis A finalizou exame Hemograma Completo do paciente Jean Carlos', 'exam', 'Hemograma Completo', 'confirmed', 'completed', '2025-06-17 15:52:29.855');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (26, 9, 'Jose  Alves', 'recepcao', 36, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Jean Carlos', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-17 20:08:28.477');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (27, 9, 'Jose  Alves', 'recepcao', 37, 'Jean Carlos', 'created', 'Dr. Jose  Alves cadastrou consulta Cardiologista para paciente Jean Carlos', 'consultation', 'Cardiologista', NULL, 'Aguardando Análise', '2025-06-17 20:11:01.436');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (28, 6, 'Mayara Sarmento', 'admin', 31, 'Jean Carlos', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-17 22:07:21.901');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (29, 6, 'Mayara Sarmento', 'admin', 37, 'Jean Carlos', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-17 22:07:24.234');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (30, 6, 'Mayara Sarmento', 'admin', 36, 'Jean Carlos', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-17 22:07:26.278');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (31, 6, 'Mayara Sarmento', 'admin', 34, 'Marylia Sousa Sarmento', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Marylia Sousa Sarmento', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-17 22:07:28.248');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (32, 6, 'Mayara Sarmento', 'admin', 32, 'Jean Carlos', 'approved', 'Secretário(a) Mayara Sarmento aprovou consulta Cardiologista do paciente Jean Carlos', 'consultation', 'Cardiologista', 'Aguardando Análise', 'received', '2025-06-17 22:07:30.218');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (33, 12, 'UBS Centro .', 'recepcao', 38, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de exame "Hemograma" para o paciente Jean Carlos', 'exam', 'Hemograma', NULL, 'received', '2025-06-17 22:59:35.562');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (34, 12, 'UBS Centro .', 'recepcao', 39, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-17 22:59:35.746');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (35, 12, 'UBS Centro .', 'recepcao', 40, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-17 23:00:43.491');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (36, 6, 'Mayara Sarmento', 'admin', 40, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-17 23:02:29.358');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (37, 6, 'Mayara Sarmento', 'admin', 39, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-17 23:02:31.731');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (38, 11, 'SMS a', 'regulacao', 40, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-17 23:08:40.893');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (39, 11, 'SMS a', 'regulacao', 39, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-17 23:08:42.772');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (40, 11, 'SMS a', 'regulacao', 40, 'Jean Carlos', 'status_changed', 'Regulação SMS a confirmou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'accepted', 'confirmed', '2025-06-17 23:09:17.494');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (41, 11, 'SMS a', 'regulacao', 39, 'Jean Carlos', 'status_changed', 'Regulação SMS a confirmou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'accepted', 'confirmed', '2025-06-17 23:09:19.891');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (42, 11, 'SMS a', 'regulacao', 38, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o exame "Hemograma" do paciente Jean Carlos', 'exam', 'Hemograma', 'received', 'accepted', '2025-06-17 23:09:22.516');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (43, 11, 'SMS a', 'regulacao', 40, 'Jean Carlos', 'completed', 'Regulação SMS a concluiu o consulta "Eletro" do paciente Jean Carlos - Agendado para 20/12/2025 às 13:00 em Maternidade', 'consulta', 'Eletro', 'confirmed', 'completed', '2025-06-17 23:19:31.577');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (44, 11, 'SMS a', 'regulacao', 39, 'Jean Carlos', 'completed', 'Regulação SMS a concluiu o consulta "Eletro" do paciente Jean Carlos - Agendado para Invalid Date às Invalid Date em HOPITAL MATERNIDADE ', 'consulta', 'Eletro', 'confirmed', 'completed', '2025-06-17 23:21:28.142');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (45, 11, 'SMS a', 'regulacao', 38, 'Jean Carlos', 'status_changed', 'Regulação SMS a confirmou o exame "Hemograma" do paciente Jean Carlos', 'exam', 'Hemograma', 'accepted', 'confirmed', '2025-06-17 23:31:58.254');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (46, 11, 'SMS a', 'regulacao', 38, 'Jean Carlos', 'completed', 'Regulação SMS a concluiu o exame "Hemograma" do paciente Jean Carlos - Agendado para 20/12/1977 às 13:00 em dsg', 'exame', 'Hemograma', 'confirmed', 'completed', '2025-06-17 23:32:27.346');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (47, 12, 'UBS Centro .', 'recepcao', 41, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos (URGENTE)', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-17 23:49:36.334');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (48, 12, 'UBS Centro .', 'recepcao', 42, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-17 23:49:56.316');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (49, 12, 'UBS Centro .', 'recepcao', 43, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-17 23:50:11.529');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (50, 6, 'Mayara Sarmento', 'admin', 41, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-17 23:50:50.771');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (51, 6, 'Mayara Sarmento', 'admin', 42, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-17 23:50:53.444');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (52, 6, 'Mayara Sarmento', 'admin', 43, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-17 23:50:55.291');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (53, 12, 'UBS Centro .', 'recepcao', 44, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos (URGENTE)', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-17 23:59:57.904');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (54, 6, 'Mayara Sarmento', 'admin', 44, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-18 00:00:40.917');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (55, 11, 'SMS a', 'regulacao', 41, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-18 00:01:23.913');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (56, 11, 'SMS a', 'regulacao', 44, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-18 00:01:26.306');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (57, 11, 'SMS a', 'regulacao', 43, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-18 00:01:34.012');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (58, 11, 'SMS a', 'regulacao', 42, 'Jean Carlos', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-18 00:01:35.818');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (59, 1, 'Jean carlos', 'admin', NULL, '', 'updated', 'Administrador Jean carlos editou o usuário "Admin a": nome alterado para "Admin", sobrenome alterado para "a"', 'user_management', 'Usuário Admin a', NULL, NULL, '2025-06-18 00:04:40.101');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (60, 12, 'UBS Centro .', 'recepcao', 45, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de exame "Hemograma" para o paciente Jean Carlos', 'exam', 'Hemograma', NULL, 'received', '2025-06-18 00:19:42.076');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (61, 12, 'UBS Centro .', 'recepcao', 46, 'Jean Carlos', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Jean Carlos', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-18 00:19:42.268');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (62, 6, 'Mayara Sarmento', 'admin', 46, 'Jean Carlos', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-18 00:20:34.979');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (63, 11, 'SMS a', 'regulacao', 44, 'Jean Carlos', 'status_changed', 'Regulação SMS a confirmou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'accepted', 'confirmed', '2025-06-18 00:22:08.311');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (64, 11, 'SMS a', 'regulacao', 44, 'Jean Carlos', 'completed', 'Regulação SMS a concluiu o consulta "Eletro" do paciente Jean Carlos - Agendado para 15/07/2025 às 12:00 em MATERNIDADE', 'consulta', 'Eletro', 'confirmed', 'completed', '2025-06-18 00:23:00.01');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (65, 11, 'SMS a', 'regulacao', 41, 'Jean Carlos', 'status_changed', 'Regulação SMS a confirmou o consulta "Eletro" do paciente Jean Carlos', 'consultation', 'Eletro', 'accepted', 'confirmed', '2025-06-18 00:24:37.059');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (66, 12, 'UBS Centro .', 'recepcao', 47, 'Marylia Sousa Sarmento', 'created', 'Atendente UBS Centro . cadastrou nova requisição de exame "Hemograma" para o paciente Marylia Sousa Sarmento', 'exam', 'Hemograma', NULL, 'received', '2025-06-18 11:53:35.347');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (67, 12, 'UBS Centro .', 'recepcao', 48, 'Marylia Sousa Sarmento', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Marylia Sousa Sarmento', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-18 11:53:35.538');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (68, 6, 'Mayara Sarmento', 'admin', 48, 'Marylia Sousa Sarmento', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Marylia Sousa Sarmento', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-18 11:55:01.985');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (69, 11, 'SMS a', 'regulacao', 48, 'Marylia Sousa Sarmento', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Marylia Sousa Sarmento', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-18 11:56:50.012');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (70, 11, 'SMS a', 'regulacao', 47, 'Marylia Sousa Sarmento', 'status_changed', 'Regulação SMS a aceitou o exame "Hemograma" do paciente Marylia Sousa Sarmento', 'exam', 'Hemograma', 'received', 'accepted', '2025-06-18 11:56:53.277');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (71, 11, 'SMS a', 'regulacao', 48, 'Marylia Sousa Sarmento', 'status_changed', 'Regulação SMS a confirmou o consulta "Eletro" do paciente Marylia Sousa Sarmento', 'consultation', 'Eletro', 'accepted', 'confirmed', '2025-06-18 11:57:02.27');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (72, 11, 'SMS a', 'regulacao', 47, 'Marylia Sousa Sarmento', 'status_changed', 'Regulação SMS a confirmou o exame "Hemograma" do paciente Marylia Sousa Sarmento', 'exam', 'Hemograma', 'accepted', 'confirmed', '2025-06-18 11:57:07.588');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (73, 11, 'SMS a', 'regulacao', 48, 'Marylia Sousa Sarmento', 'completed', 'Regulação SMS a concluiu o consulta "Eletro" do paciente Marylia Sousa Sarmento - Agendado para 19/06/2025 às 14:03 em Hospital', 'consulta', 'Eletro', 'confirmed', 'completed', '2025-06-18 11:57:57.664');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (74, 11, 'SMS a', 'regulacao', 47, 'Marylia Sousa Sarmento', 'completed', 'Regulação SMS a concluiu o exame "Hemograma" do paciente Marylia Sousa Sarmento - Agendado para 18/06/2025 às 14:59 em Hospital', 'exame', 'Hemograma', 'confirmed', 'completed', '2025-06-18 11:59:40.279');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (75, 12, 'UBS Centro .', 'recepcao', 49, 'Ruan Felipe', 'created', 'Atendente UBS Centro . cadastrou nova requisição de consulta "Eletro" para o paciente Ruan Felipe', 'consultation', 'Eletro', NULL, 'Aguardando Análise', '2025-06-18 15:08:41.869');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (76, 6, 'Mayara Sarmento', 'admin', 49, 'Ruan Felipe', 'approved', 'Administrador Mayara Sarmento aprovou a requisição de consulta "Eletro" do paciente Ruan Felipe', 'consultation', 'Eletro', 'Aguardando Análise', 'received', '2025-06-18 15:10:19.257');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (77, 11, 'SMS a', 'regulacao', 49, 'Ruan Felipe', 'status_changed', 'Regulação SMS a aceitou o consulta "Eletro" do paciente Ruan Felipe', 'consultation', 'Eletro', 'received', 'accepted', '2025-06-18 15:13:18.542');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (78, 11, 'SMS a', 'regulacao', 49, 'Ruan Felipe', 'status_changed', 'Regulação SMS a confirmou o consulta "Eletro" do paciente Ruan Felipe', 'consultation', 'Eletro', 'accepted', 'confirmed', '2025-06-18 15:14:05.162');
INSERT INTO public.activity_logs (id, user_id, user_name, user_role, request_id, patient_name, action, action_description, request_type, request_name, old_status, new_status, created_at) VALUES (79, 11, 'SMS a', 'regulacao', 49, 'Ruan Felipe', 'completed', 'Regulação SMS a concluiu o consulta "Eletro" do paciente Ruan Felipe - Agendado para 20/06/2025 às 17:19 em CIED', 'consulta', 'Eletro', 'confirmed', 'completed', '2025-06-18 15:14:42.688');


ALTER TABLE public.activity_logs ENABLE TRIGGER ALL;

--
-- TOC entry 3397 (class 0 OID 24577)
-- Dependencies: 216
-- Data for Name: consultation_types; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultation_types DISABLE TRIGGER ALL;

INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (4, 'Cardiologista', '', 20, false, '2025-06-05 23:49:14.672893', true, 5000);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (5, 'Eletro', '', 5, true, '2025-06-17 22:58:36.649956', true, 60000);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (6, 'Clínica Geral', 'Consulta médica geral', 100, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (7, 'Cardiologia', 'Consulta cardiológica', 50, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (8, 'Ginecologia', 'Consulta ginecológica', 60, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (9, 'Pediatria', 'Consulta pediátrica', 80, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (10, 'Endocrinologia', 'Consulta endocrinológica', 40, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (11, 'Dermatologia', 'Consulta dermatológica', 45, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (12, 'Ortopedia', 'Consulta ortopédica', 35, true, '2025-06-23 17:30:08.200778', false, 0);
INSERT INTO public.consultation_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (13, 'Psiquiatria', 'Consulta psiquiátrica', 30, true, '2025-06-23 17:30:08.200778', false, 0);


ALTER TABLE public.consultation_types ENABLE TRIGGER ALL;

--
-- TOC entry 3399 (class 0 OID 24588)
-- Dependencies: 218
-- Data for Name: exam_types; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.exam_types DISABLE TRIGGER ALL;

INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (6, 'Hemogramas', '', 50, false, '2025-06-16 12:00:26.510509', false, 10000);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (5, 'Hemograma Completo', '', 200, false, '2025-06-05 23:48:57.77435', false, 7000);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (7, 'Hemograma', '', 100, true, '2025-06-17 22:58:16.794644', false, 3500);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (8, 'Hemograma Completo', 'Exame de sangue completo', 200, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (9, 'Glicemia', 'Exame de glicose no sangue', 150, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (10, 'Colesterol', 'Perfil lipídico completo', 100, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (11, 'Raio-X Tórax', 'Radiografia do tórax', 80, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (12, 'Ultrassom Abdominal', 'Ultrassonografia abdominal', 60, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (13, 'Eletrocardiograma', 'ECG - exame do coração', 120, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (14, 'Urina Tipo I', 'Exame de urina completo', 180, true, '2025-06-23 17:30:08.136774', false, 0);
INSERT INTO public.exam_types (id, name, description, monthly_quota, is_active, created_at, needs_secretary_approval, price) VALUES (15, 'TSH', 'Hormônio da tireoide', 90, true, '2025-06-23 17:30:08.136774', false, 0);


ALTER TABLE public.exam_types ENABLE TRIGGER ALL;

--
-- TOC entry 3401 (class 0 OID 24599)
-- Dependencies: 220
-- Data for Name: health_units; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.health_units DISABLE TRIGGER ALL;

INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (4, 'SMS Alexandria', '', '', false, '2025-06-17 22:46:55.351026');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (5, 'UBS Centro', '', '', false, '2025-06-17 22:47:03.821077');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (7, 'Tetssdsd', 'sdas', '', false, '2025-06-23 19:19:37.618376');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (8, 'fsdf', 'sdfsd', '', false, '2025-06-23 19:26:54.854532');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (3, 'UBS CENTRO', 'Rua Desem', '', true, '2025-06-05 17:17:17.736989');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (6, 'UBS Central', 'Centro - Alexandria/RN', '(84) 3372-1234', true, '2025-06-23 17:30:08.064793');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (9, 'UBS Teste Backup', 'Rua Teste, 123', '(84) 99999-9999', true, '2025-06-23 19:31:51.290546');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (10, 'vgdfsg', 'dfgdf', '', true, '2025-06-23 19:34:27.037298');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (11, 'UBS Teste Substituição', 'Rua Nova, 456', '(84) 88888-8888', true, '2025-06-23 19:38:29.599589');


ALTER TABLE public.health_units ENABLE TRIGGER ALL;

--
-- TOC entry 3410 (class 0 OID 81921)
-- Dependencies: 229
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.logs DISABLE TRIGGER ALL;



ALTER TABLE public.logs ENABLE TRIGGER ALL;

--
-- TOC entry 3403 (class 0 OID 24610)
-- Dependencies: 222
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.patients DISABLE TRIGGER ALL;

INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (12, 'Jania Sena', 48, '84999664140', '2025-06-17 19:41:09.142608', '2025-06-17 19:50:45.834', NULL, 'Jania', '02840779412', '', '', '', '1977-02-14 00:00:00', 'id-1750189844932-782141426-Captura de tela 2025-06-11 220243.png', NULL);
INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (10, 'Jean Carlos', 38, '84999664140', '2025-06-05 23:45:57.33117', '2025-06-18 00:19:41.853', NULL, 'jean', '01311860436', 'Rua', 'asdassdd', 'RN', '1986-12-20 00:00:00', 'id-1750193837715-516510895-Captura de tela 2025-06-16 123935.png', 'id-1750188314693-430668712-Captura de tela 2025-06-16 123935.png');
INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (11, 'Marylia Sousa Sarmento', 27, '84996917798', '2025-06-17 14:34:59.744354', '2025-06-18 11:53:35.136', NULL, NULL, '08675718454', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (13, 'Ruan Felipe', 19, '84999452851', '2025-06-18 15:08:41.666949', '2025-06-18 15:08:41.666949', NULL, NULL, '70331900424', NULL, NULL, NULL, NULL, NULL, NULL);


ALTER TABLE public.patients ENABLE TRIGGER ALL;

--
-- TOC entry 3408 (class 0 OID 32769)
-- Dependencies: 227
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (6, 'mayara', '$2b$10$ayp0qdQuYZIoFsBxn6MU3OuadQQqtzGgZRFZMQF5AmN2Jl4HQ2bNq', 'a@bol.com', 'Mayara', 'Sarmento', 'admin', '', 3, true, '2025-06-05 23:46:56.251366', '2025-06-17 22:52:07.393');
INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (12, 'centro', '$2b$10$oxGku/e2FENh0G/yZIs2BOspQPYtXDEQXSWceW/r2YldmsI7vxEM.', 'as@bol.com', 'UBS Centro', '.', 'recepcao', NULL, 5, true, '2025-06-17 22:49:29.738786', '2025-06-17 22:59:20.707');
INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (11, 'sms', '$2b$10$xKMx2oX.DE399NUzve.pseZUTyYk3KOFV56vQz18sqS2huZZmpFHS', 'aa@bol.com', 'SMS', 'a', 'regulacao', NULL, 4, true, '2025-06-17 22:48:55.375669', '2025-06-18 00:01:55.164');
INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (1, 'admin', '$2b$10$r9EeG1NYckrfdPj3SXjIEO64/EBBNOhvjZjasPs/aM4OJKvJkIF7y', 'admin@sistema.local', 'Admin', 'a', 'admin', NULL, 3, true, '2025-06-05 16:45:02.818477', '2025-06-18 00:04:40.03');


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- TOC entry 3405 (class 0 OID 24621)
-- Dependencies: 224
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.requests DISABLE TRIGGER ALL;

INSERT INTO public.requests (id, patient_id, doctor_id, health_unit_id, exam_type_id, consultation_type_id, is_urgent, urgency_explanation, status, registrar_id, scheduled_date, completed_date, notes, created_at, updated_at, attachment_file_name, attachment_file_size, attachment_mime_type, attachment_uploaded_at, attachment_uploaded_by, pdf_file_name, pdf_generated_at, additional_document_file_name, additional_document_file_size, additional_document_mime_type, additional_document_uploaded_at, additional_document_uploaded_by, exam_location, exam_date, exam_time, result_file_name, result_file_size, result_mime_type, result_uploaded_at, result_uploaded_by) VALUES (48, 11, 12, 5, NULL, 5, false, NULL, 'completed', 11, NULL, '2025-06-18 11:57:57.603', NULL, '2025-06-18 11:53:35.51051', '2025-06-18 11:57:57.603', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Hospital', '2025-06-19', '14:03', 'request-1750247877300-85697630-comprovantes (6).pdf', 35298, 'application/pdf', '2025-06-18 11:57:57.603', 11);
INSERT INTO public.requests (id, patient_id, doctor_id, health_unit_id, exam_type_id, consultation_type_id, is_urgent, urgency_explanation, status, registrar_id, scheduled_date, completed_date, notes, created_at, updated_at, attachment_file_name, attachment_file_size, attachment_mime_type, attachment_uploaded_at, attachment_uploaded_by, pdf_file_name, pdf_generated_at, additional_document_file_name, additional_document_file_size, additional_document_mime_type, additional_document_uploaded_at, additional_document_uploaded_by, exam_location, exam_date, exam_time, result_file_name, result_file_size, result_mime_type, result_uploaded_at, result_uploaded_by) VALUES (47, 11, 12, 5, 7, NULL, false, NULL, 'completed', 11, NULL, '2025-06-18 11:59:40.214', NULL, '2025-06-18 11:53:35.299906', '2025-06-18 11:59:40.214', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Hospital', '2025-06-18', '14:59', 'request-1750247977854-948838057-comprovantes (5).pdf', 19657, 'application/pdf', '2025-06-18 11:59:40.214', 11);


ALTER TABLE public.requests ENABLE TRIGGER ALL;

--
-- TOC entry 3406 (class 0 OID 24633)
-- Dependencies: 225
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sessions DISABLE TRIGGER ALL;

INSERT INTO public.sessions (sid, sess, expire) VALUES ('iPc6GNtZsb8DkejM4E-cllz6Z0Asj0Ey', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-24T15:50:18.556Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 9}', '2025-06-25 12:03:33');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('Nkg2nhsxXMUNaQ9LSmQghGregwFWxG02', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:25:42.529Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:25:57');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('n51SX7dnZWELhunxShlHsUeIR6I8QWg9', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:38:20.534Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:38:30');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('nvvaE53SViBJDP_ELq_NkKBoVGjpv11j', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-25T00:26:23.183Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-25 00:27:33');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('xESAgyhKQsNfUB5IsNyzpPQUmUZ91Bot', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:31:20.908Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:32:04');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('hDxThBsXwfIVDKjNqpBcnFnYGdhnnGP3', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:32:24.756Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:33:33');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('UoaPvKc1o2orubLR9bmOUePj73kkMEfI', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:14:11.768Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:14:12');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('_Ee5POHV1K01g84MyR0QkYMpzmWHQ3qB', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:22:13.885Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:41:07');


ALTER TABLE public.sessions ENABLE TRIGGER ALL;

--
-- TOC entry 3418 (class 0 OID 0)
-- Dependencies: 230
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 79, true);


--
-- TOC entry 3419 (class 0 OID 0)
-- Dependencies: 215
-- Name: consultation_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consultation_types_id_seq', 13, true);


--
-- TOC entry 3420 (class 0 OID 0)
-- Dependencies: 217
-- Name: exam_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_types_id_seq', 15, true);


--
-- TOC entry 3421 (class 0 OID 0)
-- Dependencies: 219
-- Name: health_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.health_units_id_seq', 11, true);


--
-- TOC entry 3422 (class 0 OID 0)
-- Dependencies: 228
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, false);


--
-- TOC entry 3423 (class 0 OID 0)
-- Dependencies: 221
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patients_id_seq', 13, true);


--
-- TOC entry 3424 (class 0 OID 0)
-- Dependencies: 223
-- Name: requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requests_id_seq', 49, true);


--
-- TOC entry 3425 (class 0 OID 0)
-- Dependencies: 226
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 18, true);


-- Completed on 2025-06-23 19:41:15 UTC

--
-- PostgreSQL database dump complete
--

