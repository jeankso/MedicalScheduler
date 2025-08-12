--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

-- Started on 2025-06-23 19:31:38 UTC

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

DROP DATABASE IF EXISTS neondb;
--
-- TOC entry 3448 (class 1262 OID 16389)
-- Name: neondb; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE neondb WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C.UTF-8';


\connect neondb

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 231 (class 1259 OID 81931)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_name character varying(255) NOT NULL,
    user_role character varying(50) NOT NULL,
    request_id integer,
    patient_name character varying(255),
    action character varying(100) NOT NULL,
    action_description text,
    request_type character varying(50),
    request_name character varying(255),
    old_status character varying(100),
    new_status character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 230 (class 1259 OID 81930)
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3449 (class 0 OID 0)
-- Dependencies: 230
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- TOC entry 216 (class 1259 OID 24577)
-- Name: consultation_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_types (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    monthly_quota integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    needs_secretary_approval boolean DEFAULT false,
    price integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 215 (class 1259 OID 24576)
-- Name: consultation_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consultation_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3450 (class 0 OID 0)
-- Dependencies: 215
-- Name: consultation_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultation_types_id_seq OWNED BY public.consultation_types.id;


--
-- TOC entry 218 (class 1259 OID 24588)
-- Name: exam_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_types (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    monthly_quota integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    needs_secretary_approval boolean DEFAULT false,
    price integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 217 (class 1259 OID 24587)
-- Name: exam_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3451 (class 0 OID 0)
-- Dependencies: 217
-- Name: exam_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_types_id_seq OWNED BY public.exam_types.id;


--
-- TOC entry 220 (class 1259 OID 24599)
-- Name: health_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_units (
    id integer NOT NULL,
    name character varying NOT NULL,
    address text,
    phone character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 219 (class 1259 OID 24598)
-- Name: health_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3452 (class 0 OID 0)
-- Dependencies: 219
-- Name: health_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_units_id_seq OWNED BY public.health_units.id;


--
-- TOC entry 229 (class 1259 OID 81921)
-- Name: logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    user_id integer,
    activity_type character varying(255) NOT NULL,
    description text NOT NULL,
    related_table character varying(255),
    related_id integer
);


--
-- TOC entry 228 (class 1259 OID 81920)
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3453 (class 0 OID 0)
-- Dependencies: 228
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- TOC entry 222 (class 1259 OID 24610)
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    name character varying NOT NULL,
    age integer NOT NULL,
    phone character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    notes text,
    social_name character varying(255),
    cpf character varying(14),
    address character varying(500),
    city character varying(100),
    state character varying(2),
    birth_date timestamp without time zone,
    id_photo_front character varying,
    id_photo_back character varying
);


--
-- TOC entry 221 (class 1259 OID 24609)
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3454 (class 0 OID 0)
-- Dependencies: 221
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- TOC entry 224 (class 1259 OID 24621)
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    health_unit_id integer NOT NULL,
    exam_type_id integer,
    consultation_type_id integer,
    is_urgent boolean DEFAULT false,
    urgency_explanation text,
    status character varying DEFAULT 'received'::character varying NOT NULL,
    registrar_id integer,
    scheduled_date timestamp without time zone,
    completed_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    attachment_file_name character varying,
    attachment_file_size integer,
    attachment_mime_type character varying,
    attachment_uploaded_at timestamp without time zone,
    attachment_uploaded_by integer,
    pdf_file_name character varying,
    pdf_generated_at timestamp without time zone,
    additional_document_file_name character varying,
    additional_document_file_size integer,
    additional_document_mime_type character varying,
    additional_document_uploaded_at timestamp without time zone,
    additional_document_uploaded_by integer,
    exam_location character varying,
    exam_date character varying,
    exam_time character varying,
    result_file_name character varying,
    result_file_size integer,
    result_mime_type character varying,
    result_uploaded_at timestamp without time zone,
    result_uploaded_by integer
);


--
-- TOC entry 223 (class 1259 OID 24620)
-- Name: requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3455 (class 0 OID 0)
-- Dependencies: 223
-- Name: requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requests_id_seq OWNED BY public.requests.id;


--
-- TOC entry 225 (class 1259 OID 24633)
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 32769)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying NOT NULL,
    password character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    role character varying DEFAULT 'doctor'::character varying NOT NULL,
    crm character varying,
    health_unit_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 226 (class 1259 OID 32768)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3456 (class 0 OID 0)
-- Dependencies: 226
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3247 (class 2604 OID 155648)
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- TOC entry 3219 (class 2604 OID 155649)
-- Name: consultation_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_types ALTER COLUMN id SET DEFAULT nextval('public.consultation_types_id_seq'::regclass);


--
-- TOC entry 3224 (class 2604 OID 155650)
-- Name: exam_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_types ALTER COLUMN id SET DEFAULT nextval('public.exam_types_id_seq'::regclass);


--
-- TOC entry 3229 (class 2604 OID 155651)
-- Name: health_units id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_units ALTER COLUMN id SET DEFAULT nextval('public.health_units_id_seq'::regclass);


--
-- TOC entry 3245 (class 2604 OID 155652)
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- TOC entry 3232 (class 2604 OID 155653)
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- TOC entry 3235 (class 2604 OID 155654)
-- Name: requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests ALTER COLUMN id SET DEFAULT nextval('public.requests_id_seq'::regclass);


--
-- TOC entry 3240 (class 2604 OID 155655)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3442 (class 0 OID 81931)
-- Dependencies: 231
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

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


--
-- TOC entry 3427 (class 0 OID 24577)
-- Dependencies: 216
-- Data for Name: consultation_types; Type: TABLE DATA; Schema: public; Owner: -
--

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


--
-- TOC entry 3429 (class 0 OID 24588)
-- Dependencies: 218
-- Data for Name: exam_types; Type: TABLE DATA; Schema: public; Owner: -
--

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


--
-- TOC entry 3431 (class 0 OID 24599)
-- Dependencies: 220
-- Data for Name: health_units; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (3, 'UBS CENTRO', 'Rua Desem', '', false, '2025-06-05 17:17:17.736989');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (4, 'SMS Alexandria', '', '', false, '2025-06-17 22:46:55.351026');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (5, 'UBS Centro', '', '', false, '2025-06-17 22:47:03.821077');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (6, 'UBS Central', 'Centro - Alexandria/RN', '(84) 3372-1234', false, '2025-06-23 17:30:08.064793');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (7, 'Tetssdsd', 'sdas', '', false, '2025-06-23 19:19:37.618376');
INSERT INTO public.health_units (id, name, address, phone, is_active, created_at) VALUES (8, 'fsdf', 'sdfsd', '', false, '2025-06-23 19:26:54.854532');


--
-- TOC entry 3440 (class 0 OID 81921)
-- Dependencies: 229
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 3433 (class 0 OID 24610)
-- Dependencies: 222
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (12, 'Jania Sena', 48, '84999664140', '2025-06-17 19:41:09.142608', '2025-06-17 19:50:45.834', NULL, 'Jania', '02840779412', '', '', '', '1977-02-14 00:00:00', 'id-1750189844932-782141426-Captura de tela 2025-06-11 220243.png', NULL);
INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (10, 'Jean Carlos', 38, '84999664140', '2025-06-05 23:45:57.33117', '2025-06-18 00:19:41.853', NULL, 'jean', '01311860436', 'Rua', 'asdassdd', 'RN', '1986-12-20 00:00:00', 'id-1750193837715-516510895-Captura de tela 2025-06-16 123935.png', 'id-1750188314693-430668712-Captura de tela 2025-06-16 123935.png');
INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (11, 'Marylia Sousa Sarmento', 27, '84996917798', '2025-06-17 14:34:59.744354', '2025-06-18 11:53:35.136', NULL, NULL, '08675718454', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.patients (id, name, age, phone, created_at, updated_at, notes, social_name, cpf, address, city, state, birth_date, id_photo_front, id_photo_back) VALUES (13, 'Ruan Felipe', 19, '84999452851', '2025-06-18 15:08:41.666949', '2025-06-18 15:08:41.666949', NULL, NULL, '70331900424', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 3435 (class 0 OID 24621)
-- Dependencies: 224
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.requests (id, patient_id, doctor_id, health_unit_id, exam_type_id, consultation_type_id, is_urgent, urgency_explanation, status, registrar_id, scheduled_date, completed_date, notes, created_at, updated_at, attachment_file_name, attachment_file_size, attachment_mime_type, attachment_uploaded_at, attachment_uploaded_by, pdf_file_name, pdf_generated_at, additional_document_file_name, additional_document_file_size, additional_document_mime_type, additional_document_uploaded_at, additional_document_uploaded_by, exam_location, exam_date, exam_time, result_file_name, result_file_size, result_mime_type, result_uploaded_at, result_uploaded_by) VALUES (48, 11, 12, 5, NULL, 5, false, NULL, 'completed', 11, NULL, '2025-06-18 11:57:57.603', NULL, '2025-06-18 11:53:35.51051', '2025-06-18 11:57:57.603', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Hospital', '2025-06-19', '14:03', 'request-1750247877300-85697630-comprovantes (6).pdf', 35298, 'application/pdf', '2025-06-18 11:57:57.603', 11);
INSERT INTO public.requests (id, patient_id, doctor_id, health_unit_id, exam_type_id, consultation_type_id, is_urgent, urgency_explanation, status, registrar_id, scheduled_date, completed_date, notes, created_at, updated_at, attachment_file_name, attachment_file_size, attachment_mime_type, attachment_uploaded_at, attachment_uploaded_by, pdf_file_name, pdf_generated_at, additional_document_file_name, additional_document_file_size, additional_document_mime_type, additional_document_uploaded_at, additional_document_uploaded_by, exam_location, exam_date, exam_time, result_file_name, result_file_size, result_mime_type, result_uploaded_at, result_uploaded_by) VALUES (47, 11, 12, 5, 7, NULL, false, NULL, 'completed', 11, NULL, '2025-06-18 11:59:40.214', NULL, '2025-06-18 11:53:35.299906', '2025-06-18 11:59:40.214', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Hospital', '2025-06-18', '14:59', 'request-1750247977854-948838057-comprovantes (5).pdf', 19657, 'application/pdf', '2025-06-18 11:59:40.214', 11);


--
-- TOC entry 3436 (class 0 OID 24633)
-- Dependencies: 225
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions (sid, sess, expire) VALUES ('iPc6GNtZsb8DkejM4E-cllz6Z0Asj0Ey', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-24T15:50:18.556Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 9}', '2025-06-25 12:03:33');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('Nkg2nhsxXMUNaQ9LSmQghGregwFWxG02', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:25:42.529Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:25:57');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('nvvaE53SViBJDP_ELq_NkKBoVGjpv11j', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-25T00:26:23.183Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-25 00:27:33');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('_Ee5POHV1K01g84MyR0QkYMpzmWHQ3qB', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:22:13.885Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:28:27');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('xESAgyhKQsNfUB5IsNyzpPQUmUZ91Bot', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:31:20.908Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:31:37');
INSERT INTO public.sessions (sid, sess, expire) VALUES ('UoaPvKc1o2orubLR9bmOUePj73kkMEfI', '{"cookie": {"path": "/", "secure": false, "expires": "2025-06-30T19:14:11.768Z", "httpOnly": true, "originalMaxAge": 604800000}, "userId": 1}', '2025-06-30 19:14:12');


--
-- TOC entry 3438 (class 0 OID 32769)
-- Dependencies: 227
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (6, 'mayara', '$2b$10$ayp0qdQuYZIoFsBxn6MU3OuadQQqtzGgZRFZMQF5AmN2Jl4HQ2bNq', 'a@bol.com', 'Mayara', 'Sarmento', 'admin', '', 3, true, '2025-06-05 23:46:56.251366', '2025-06-17 22:52:07.393');
INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (12, 'centro', '$2b$10$oxGku/e2FENh0G/yZIs2BOspQPYtXDEQXSWceW/r2YldmsI7vxEM.', 'as@bol.com', 'UBS Centro', '.', 'recepcao', NULL, 5, true, '2025-06-17 22:49:29.738786', '2025-06-17 22:59:20.707');
INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (11, 'sms', '$2b$10$xKMx2oX.DE399NUzve.pseZUTyYk3KOFV56vQz18sqS2huZZmpFHS', 'aa@bol.com', 'SMS', 'a', 'regulacao', NULL, 4, true, '2025-06-17 22:48:55.375669', '2025-06-18 00:01:55.164');
INSERT INTO public.users (id, username, password, email, first_name, last_name, role, crm, health_unit_id, is_active, created_at, updated_at) VALUES (1, 'admin', '$2b$10$r9EeG1NYckrfdPj3SXjIEO64/EBBNOhvjZjasPs/aM4OJKvJkIF7y', 'admin@sistema.local', 'Admin', 'a', 'admin', NULL, 3, true, '2025-06-05 16:45:02.818477', '2025-06-18 00:04:40.03');


--
-- TOC entry 3457 (class 0 OID 0)
-- Dependencies: 230
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 79, true);


--
-- TOC entry 3458 (class 0 OID 0)
-- Dependencies: 215
-- Name: consultation_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consultation_types_id_seq', 13, true);


--
-- TOC entry 3459 (class 0 OID 0)
-- Dependencies: 217
-- Name: exam_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_types_id_seq', 15, true);


--
-- TOC entry 3460 (class 0 OID 0)
-- Dependencies: 219
-- Name: health_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.health_units_id_seq', 8, true);


--
-- TOC entry 3461 (class 0 OID 0)
-- Dependencies: 228
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, false);


--
-- TOC entry 3462 (class 0 OID 0)
-- Dependencies: 221
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patients_id_seq', 13, true);


--
-- TOC entry 3463 (class 0 OID 0)
-- Dependencies: 223
-- Name: requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requests_id_seq', 49, true);


--
-- TOC entry 3464 (class 0 OID 0)
-- Dependencies: 226
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 18, true);


--
-- TOC entry 3274 (class 2606 OID 81939)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3250 (class 2606 OID 24586)
-- Name: consultation_types consultation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_types
    ADD CONSTRAINT consultation_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3252 (class 2606 OID 24597)
-- Name: exam_types exam_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_types
    ADD CONSTRAINT exam_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3254 (class 2606 OID 24608)
-- Name: health_units health_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_units
    ADD CONSTRAINT health_units_pkey PRIMARY KEY (id);


--
-- TOC entry 3272 (class 2606 OID 81929)
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3256 (class 2606 OID 49153)
-- Name: patients patients_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_cpf_key UNIQUE (cpf);


--
-- TOC entry 3258 (class 2606 OID 24619)
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- TOC entry 3260 (class 2606 OID 24632)
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- TOC entry 3264 (class 2606 OID 24639)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- TOC entry 3266 (class 2606 OID 32784)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3268 (class 2606 OID 32780)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3270 (class 2606 OID 32782)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3261 (class 1259 OID 24688)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- TOC entry 3262 (class 1259 OID 114688)
-- Name: idx_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_expire ON public.sessions USING btree (expire);


--
-- TOC entry 3275 (class 2606 OID 90112)
-- Name: requests requests_additional_document_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_additional_document_uploaded_by_fkey FOREIGN KEY (additional_document_uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 3276 (class 2606 OID 65536)
-- Name: requests requests_attachment_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_attachment_uploaded_by_fkey FOREIGN KEY (attachment_uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 3277 (class 2606 OID 24673)
-- Name: requests requests_consultation_type_id_consultation_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_consultation_type_id_consultation_types_id_fk FOREIGN KEY (consultation_type_id) REFERENCES public.consultation_types(id);


--
-- TOC entry 3278 (class 2606 OID 24668)
-- Name: requests requests_exam_type_id_exam_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_exam_type_id_exam_types_id_fk FOREIGN KEY (exam_type_id) REFERENCES public.exam_types(id);


--
-- TOC entry 3279 (class 2606 OID 24663)
-- Name: requests requests_health_unit_id_health_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_health_unit_id_health_units_id_fk FOREIGN KEY (health_unit_id) REFERENCES public.health_units(id);


--
-- TOC entry 3280 (class 2606 OID 24653)
-- Name: requests requests_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- TOC entry 3281 (class 2606 OID 98304)
-- Name: requests requests_result_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_result_uploaded_by_fkey FOREIGN KEY (result_uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 3282 (class 2606 OID 32785)
-- Name: users users_health_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_health_unit_id_fkey FOREIGN KEY (health_unit_id) REFERENCES public.health_units(id);


-- Completed on 2025-06-23 19:31:45 UTC

--
-- PostgreSQL database dump complete
--

