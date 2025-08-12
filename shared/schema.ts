import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("recepcao"), // recepcao, regulacao, admin
  crm: varchar("crm"),
  healthUnitId: integer("health_unit_id").references(() => healthUnits.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const healthUnits = pgTable("health_units", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: text("address").notNull(), // Endereço obrigatório para aparecer na receita
  phone: varchar("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const examTypes = pgTable("exam_types", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  monthlyQuota: integer("monthly_quota").notNull(),
  price: integer("price").notNull().default(0), // Price in cents
  needsSecretaryApproval: boolean("needs_secretary_approval").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consultationTypes = pgTable("consultation_types", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  monthlyQuota: integer("monthly_quota").notNull(),
  price: integer("price").notNull().default(0), // Price in cents
  needsSecretaryApproval: boolean("needs_secretary_approval").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull().default("info"), // "info", "warning", "success", "error"
  targetRole: varchar("target_role"), // "admin", "regulacao", "recepcao", null for all
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userName: varchar("user_name").notNull(),
  userRole: varchar("user_role").notNull(),
  requestId: integer("request_id").references(() => requests.id),
  patientName: varchar("patient_name").notNull(),
  action: varchar("action").notNull(), // "created", "status_changed", "completed", "approved", "rejected"
  actionDescription: text("action_description").notNull(),
  requestType: varchar("request_type").notNull(), // "exam" or "consultation"
  requestName: varchar("request_name").notNull(),
  oldStatus: varchar("old_status"),
  newStatus: varchar("new_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  socialName: varchar("social_name"),
  cpf: varchar("cpf", { length: 14 }).unique().notNull(),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  birthDate: timestamp("birth_date"),
  age: integer("age").notNull(),
  phone: varchar("phone").notNull(),
  notes: text("notes"), // Campo para anotações sobre o caso do paciente
  idPhotoFront: varchar("id_photo_front"), // Foto da frente da identidade
  idPhotoBack: varchar("id_photo_back"), // Foto do verso da identidade
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  healthUnitId: integer("health_unit_id").references(() => healthUnits.id).notNull(),
  examTypeId: integer("exam_type_id").references(() => examTypes.id),
  consultationTypeId: integer("consultation_type_id").references(() => consultationTypes.id),
  isUrgent: boolean("is_urgent").default(false),
  urgencyExplanation: text("urgency_explanation"),
  status: varchar("status").notNull().default("received"), // received, accepted, confirmed, completed, suspenso
  registrarId: integer("registrar_id").references(() => users.id),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  attachmentFileName: varchar("attachment_file_name"),
  attachmentFileSize: integer("attachment_file_size"),
  attachmentMimeType: varchar("attachment_mime_type"),
  attachmentUploadedAt: timestamp("attachment_uploaded_at"),
  attachmentUploadedBy: integer("attachment_uploaded_by").references(() => users.id),
  additionalDocumentFileName: varchar("additional_document_file_name"),
  additionalDocumentFileSize: integer("additional_document_file_size"),
  additionalDocumentMimeType: varchar("additional_document_mime_type"),
  additionalDocumentUploadedAt: timestamp("additional_document_uploaded_at"),
  additionalDocumentUploadedBy: integer("additional_document_uploaded_by").references(() => users.id),
  pdfFileName: varchar("pdf_file_name"),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  // Completion fields
  examLocation: varchar("exam_location"),
  examDate: varchar("exam_date"),
  examTime: varchar("exam_time"),
  resultFileName: varchar("result_file_name"),
  resultFileSize: integer("result_file_size"),
  resultMimeType: varchar("result_mime_type"),
  resultUploadedAt: timestamp("result_uploaded_at"),
  resultUploadedBy: integer("result_uploaded_by").references(() => users.id),
  // Forwarding fields for month management
  forwardedToMonth: integer("forwarded_to_month"), // 1-12 for month
  forwardedToYear: integer("forwarded_to_year"), // year
  forwardedBy: integer("forwarded_by").references(() => users.id),
  forwardedAt: timestamp("forwarded_at"),
  forwardedReason: text("forwarded_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  healthUnit: one(healthUnits, {
    fields: [users.healthUnitId],
    references: [healthUnits.id],
  }),
  doctorRequests: many(requests, { relationName: "doctor" }),
  registrarRequests: many(requests, { relationName: "registrar" }),
}));

export const healthUnitsRelations = relations(healthUnits, ({ many }) => ({
  users: many(users),
  requests: many(requests),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  requests: many(requests),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  patient: one(patients, {
    fields: [requests.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [requests.doctorId],
    references: [users.id],
    relationName: "doctor",
  }),
  registrar: one(users, {
    fields: [requests.registrarId],
    references: [users.id],
    relationName: "registrar",
  }),
  healthUnit: one(healthUnits, {
    fields: [requests.healthUnitId],
    references: [healthUnits.id],
  }),
  examType: one(examTypes, {
    fields: [requests.examTypeId],
    references: [examTypes.id],
  }),
  consultationType: one(consultationTypes, {
    fields: [requests.consultationTypeId],
    references: [consultationTypes.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  request: one(requests, {
    fields: [activityLogs.requestId],
    references: [requests.id],
  }),
}));

export const examTypesRelations = relations(examTypes, ({ many }) => ({
  requests: many(requests),
}));

export const consultationTypesRelations = relations(consultationTypes, ({ many }) => ({
  requests: many(requests),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertHealthUnitSchema = createInsertSchema(healthUnits).omit({
  id: true,
  createdAt: true,
});

export const insertExamTypeSchema = createInsertSchema(examTypes).omit({
  id: true,
  createdAt: true,
});

export const insertConsultationTypeSchema = createInsertSchema(consultationTypes).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cpf: z.string().min(11, "CPF deve ter pelo menos 11 caracteres").optional(),
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  examTypeId: true,
  consultationTypeId: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type HealthUnit = typeof healthUnits.$inferSelect;
export type InsertHealthUnit = z.infer<typeof insertHealthUnitSchema>;
export type ExamType = typeof examTypes.$inferSelect;
export type InsertExamType = z.infer<typeof insertExamTypeSchema>;
export type ConsultationType = typeof consultationTypes.$inferSelect;
export type InsertConsultationType = z.infer<typeof insertConsultationTypeSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

// Extended types with relations
export type RequestWithRelations = Request & {
  patient: Patient;
  doctor: User;
  registrar?: User;
  healthUnit: HealthUnit;
  examType?: ExamType;
  consultationType?: ConsultationType;
};

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
