import {
  users,
  healthUnits,
  examTypes,
  consultationTypes,
  patients,
  requests,
  activityLogs,
  notifications,
  type User,
  type UpsertUser,
  type HealthUnit,
  type InsertHealthUnit,
  type ExamType,
  type InsertExamType,
  type ConsultationType,
  type InsertConsultationType,
  type Patient,
  type InsertPatient,
  type Request,
  type InsertRequest,
  type RequestWithRelations,
  type ActivityLog,
  type InsertActivityLog,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { and, eq, gte, lte, desc, sql, count, or, lt, ne, like, not } from "drizzle-orm";
import { inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Health Units
  getHealthUnits(): Promise<HealthUnit[]>;
  createHealthUnit(healthUnit: InsertHealthUnit): Promise<HealthUnit>;
  updateHealthUnit(id: number, healthUnit: Partial<InsertHealthUnit>): Promise<HealthUnit>;
  deleteHealthUnit(id: number): Promise<void>;

  // Exam Types
  getExamTypes(): Promise<ExamType[]>;
  createExamType(examType: InsertExamType): Promise<ExamType>;
  updateExamType(id: number, examType: Partial<InsertExamType>): Promise<ExamType>;
  deleteExamType(id: number): Promise<void>;

  // Consultation Types
  getConsultationTypes(): Promise<ConsultationType[]>;
  createConsultationType(consultationType: InsertConsultationType): Promise<ConsultationType>;
  updateConsultationType(id: number, consultationType: Partial<InsertConsultationType>): Promise<ConsultationType>;
  deleteConsultationType(id: number): Promise<void>;

  // Patients
  searchPatients(query: string): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getOrCreatePatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  getPatientRequests(patientId: number): Promise<RequestWithRelations[]>;

  // Requests
  getRequests(filters?: { status?: string; isUrgent?: boolean; doctorId?: string; registrarId?: string }): Promise<RequestWithRelations[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequestStatus(id: number, status: string, registrarId?: number): Promise<Request>;
  getFailedRequestsByUser(userId: number): Promise<RequestWithRelations[]>;
  updateRequestAttachment(id: number, attachmentData: {
    attachmentFileName: string;
    attachmentFileSize: number;
    attachmentMimeType: string;
    attachmentUploadedAt: Date;
    attachmentUploadedBy: number | null;
  }): Promise<Request>;
  updateRequestAdditionalDocument(id: number, additionalDocData: {
    additionalDocumentFileName: string;
    additionalDocumentFileSize: number;
    additionalDocumentMimeType: string;
    additionalDocumentUploadedAt: Date;
    additionalDocumentUploadedBy: number | null;
  }): Promise<Request>;
  completeRequestWithResult(id: number, completionData: {
    examLocation: string;
    examDate: string;
    examTime: string;
    resultFileName: string;
    resultFileSize: number;
    resultMimeType: string;
    resultUploadedAt: Date;
    resultUploadedBy: number;
  }): Promise<Request>;
  getUrgentRequests(): Promise<RequestWithRelations[]>;
  getRequestById(id: number): Promise<RequestWithRelations | undefined>;
  deleteRequest(id: number): Promise<void>;

  // Dashboard stats
  getRequestStats(year?: number, month?: number): Promise<{
    received: number;
    accepted: number;
    confirmed: number;
    completed: number;
  }>;

  getMonthlyQuotaUsage(): Promise<Array<{
    type: 'exam' | 'consultation';
    name: string;
    quota: number;
    used: number;
  }>>;

  // Users by role
  getUsersByRole(role: string): Promise<User[]>;
  getUsersInHealthUnit(healthUnitId: number): Promise<User[]>;

  // Secretary functions
  getPendingSecretaryRequests(month?: number, year?: number, includeForwarded?: boolean, forwardedMonth?: number, forwardedYear?: number, includeReceived?: boolean): Promise<RequestWithRelations[]>;
  approveSecretaryRequest(requestId: number): Promise<Request>;
  rejectSecretaryRequest(requestId: number): Promise<Request>;
  getSecretaryDashboardStats(): Promise<{
    totalRequests: number;
    pendingApproval: number;
    approvedToday: number;
    rejectedToday: number;
    urgentPending: number;
  }>;
  getSecretaryRecentActivity(): Promise<Array<{
    id: number;
    type: 'approved' | 'rejected' | 'pending';
    patientName: string;
    requestType: string;
    requestName: string;
    date: string;
    isUrgent: boolean;
  }>>;

  // Patient search by CPF
  getPatientByCpf(cpf: string): Promise<Patient | undefined>;
  getPatientRequestsByCpf(cpf: string): Promise<{ patient: Patient; requests: RequestWithRelations[] } | undefined>;

  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;

  // Notifications
  getNotifications(role?: string): Promise<Notification[]>;
  getActiveNotifications(role?: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;
  toggleNotificationStatus(id: number): Promise<Notification>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Check if user has associated requests before deletion
    const userRequests = await db.select({ count: sql`count(*)` })
      .from(requests)
      .where(or(
        eq(requests.doctorId, id),
        eq(requests.registrarId, id),
        eq(requests.attachmentUploadedBy, id)
      ));

    const requestCount = Number(userRequests[0]?.count || 0);

    if (requestCount > 0) {
      throw new Error("Não é possível excluir usuário que possui requisições associadas. Transfira ou remova as requisições primeiro.");
    }

    await db.delete(users).where(eq(users.id, id));
  }

  // Health Units
  async getHealthUnits(): Promise<HealthUnit[]> {
    return await db.select().from(healthUnits).where(eq(healthUnits.isActive, true));
  }

  async createHealthUnit(healthUnit: InsertHealthUnit): Promise<HealthUnit> {
    const [newHealthUnit] = await db.insert(healthUnits).values(healthUnit).returning();
    return newHealthUnit;
  }

  async updateHealthUnit(id: number, healthUnit: Partial<InsertHealthUnit>): Promise<HealthUnit> {
    const [updatedHealthUnit] = await db
      .update(healthUnits)
      .set(healthUnit)
      .where(eq(healthUnits.id, id))
      .returning();
    return updatedHealthUnit;
  }

  async deleteHealthUnit(id: number): Promise<void> {
    await db.update(healthUnits).set({ isActive: false }).where(eq(healthUnits.id, id));
  }

  // Exam Types
  async getExamTypes(): Promise<ExamType[]> {
    return await db.select().from(examTypes).where(eq(examTypes.isActive, true));
  }

  async createExamType(examType: InsertExamType): Promise<ExamType> {
    const [newExamType] = await db.insert(examTypes).values(examType).returning();
    return newExamType;
  }

  async updateExamType(id: number, examType: Partial<InsertExamType>): Promise<ExamType> {
    const [updatedExamType] = await db
      .update(examTypes)
      .set(examType)
      .where(eq(examTypes.id, id))
      .returning();
    return updatedExamType;
  }

  async deleteExamType(id: number): Promise<void> {
    await db.update(examTypes).set({ isActive: false }).where(eq(examTypes.id, id));
  }

  // Consultation Types
  async getConsultationTypes(): Promise<ConsultationType[]> {
    return await db.select().from(consultationTypes).where(eq(consultationTypes.isActive, true));
  }

  async createConsultationType(consultationType: InsertConsultationType): Promise<ConsultationType> {
    const [newConsultationType] = await db.insert(consultationTypes).values(consultationType).returning();
    return newConsultationType;
  }

  async updateConsultationType(id: number, consultationType: Partial<InsertConsultationType>): Promise<ConsultationType> {
    const [updatedConsultationType] = await db
      .update(consultationTypes)
      .set(consultationType)
      .where(eq(consultationTypes.id, id))
      .returning();
    return updatedConsultationType;
  }

  async deleteConsultationType(id: number): Promise<void> {
    await db.update(consultationTypes).set({ isActive: false }).where(eq(consultationTypes.id, id));
  }

  // Patients
  async searchPatients(query: string): Promise<Patient[]> {
    console.log("🔍 STORAGE DEBUG - Searching for:", query);
    
    // First, get patients with suspended requests that we need to exclude
    const suspendedPatientsQuery = db
      .selectDistinct({ patientId: requests.patientId })
      .from(requests)
      .where(eq(requests.status, 'suspenso'));

    const suspendedPatients = await suspendedPatientsQuery;
    const suspendedPatientIds = suspendedPatients.map(p => p.patientId);

    console.log('🔍 STORAGE DEBUG - Suspended patient IDs to exclude:', suspendedPatientIds);

    // Search by name or CPF - simplified query, excluding suspended patients
    let whereCondition = or(
      sql`LOWER(${patients.name}) LIKE LOWER(${`%${query}%`})`,
      sql`${patients.cpf} LIKE ${`%${query}%`}`
    );

    // Add condition to exclude suspended patients if any exist
    if (suspendedPatientIds.length > 0) {
      whereCondition = and(
        whereCondition,
        not(inArray(patients.id, suspendedPatientIds))
      );
    }

    const results = await db
      .select()
      .from(patients)
      .where(whereCondition)
      .limit(10);
    
    console.log("🔍 STORAGE DEBUG - Found results after filtering suspended:", results.length);
    
    // Get health unit data separately for each patient
    const patientsWithHealthUnits = await Promise.all(
      results.map(async (patient) => {
        if (patient.healthUnitId) {
          const [healthUnit] = await db
            .select()
            .from(healthUnits)
            .where(eq(healthUnits.id, patient.healthUnitId));
          return { ...patient, healthUnit };
        }
        return { ...patient, healthUnit: null };
      })
    );
    
    return patientsWithHealthUnits;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async getOrCreatePatient(patient: InsertPatient): Promise<Patient> {
    // Try to find existing patient by CPF first (primary identifier)
    if (patient.cpf) {
      const [existingPatient] = await db
        .select()
        .from(patients)
        .where(eq(patients.cpf, patient.cpf));

      if (existingPatient) {
        // Update patient data with new information
        const [updatedPatient] = await db
          .update(patients)
          .set({ 
            name: patient.name,
            socialName: patient.socialName,
            age: patient.age,
            phone: patient.phone,
            address: patient.address,
            city: patient.city,
            state: patient.state,
            birthDate: patient.birthDate,
            notes: patient.notes,
            updatedAt: new Date() 
          })
          .where(eq(patients.id, existingPatient.id))
          .returning();
        return updatedPatient;
      }
    }

    // If no CPF or no existing patient found, try by name and phone
    const [existingByNamePhone] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.name, patient.name), eq(patients.phone, patient.phone)));

    if (existingByNamePhone) {
      // Update with new data including CPF if provided
      const [updatedPatient] = await db
        .update(patients)
        .set({ 
          cpf: patient.cpf || existingByNamePhone.cpf,
          socialName: patient.socialName,
          age: patient.age,
          address: patient.address,
          city: patient.city,
          state: patient.state,
          birthDate: patient.birthDate,
          notes: patient.notes,
          updatedAt: new Date() 
        })
        .where(eq(patients.id, existingByNamePhone.id))
        .returning();
      return updatedPatient;
    }

    // Create new patient
    return await this.createPatient(patient);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient> {
    const [patient] = await db
      .update(patients)
      .set({ 
        ...patientData,
        updatedAt: new Date() 
      })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  async getPatientRequests(patientId: number): Promise<RequestWithRelations[]> {
    const results = await db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .where(eq(requests.patientId, patientId))
      .orderBy(desc(requests.createdAt));

    return results.map(result => ({
      ...result.requests,
      patient: result.patients!,
      doctor: result.users!,
      healthUnit: result.health_units!,
      examType: result.exam_types || undefined,
      consultationType: result.consultation_types || undefined,
    }));
  }

  // Requests
  async getRequests(filters?: { status?: string; isUrgent?: boolean; doctorId?: string; registrarId?: string; year?: number; month?: number }): Promise<RequestWithRelations[]> {
    let baseQuery = db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .orderBy(desc(requests.createdAt));

    const conditions = [];
    // ALWAYS exclude suspended and "Aguardando Análise" requests from main panels
    conditions.push(ne(requests.status, 'suspenso'));
    conditions.push(ne(requests.status, 'Aguardando Análise'));
    
    if (filters?.status) conditions.push(eq(requests.status, filters.status));
    if (filters?.isUrgent !== undefined) conditions.push(eq(requests.isUrgent, filters.isUrgent));
    if (filters?.doctorId) conditions.push(eq(requests.doctorId, filters.doctorId));
    if (filters?.registrarId) conditions.push(eq(requests.registrarId, filters.registrarId));
    
    // Apply date filters that include forwarded requests
    if (filters?.year && filters?.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      endDate.setHours(23, 59, 59, 999);
      
      conditions.push(
        or(
          and(
            gte(requests.createdAt, startDate),
            lte(requests.createdAt, endDate)
          ),
          and(
            eq(requests.forwardedToMonth, filters.month),
            eq(requests.forwardedToYear, filters.year)
          )
        )
      );
    }

    let results;
    if (conditions.length > 0) {
      results = await baseQuery.where(and(...conditions));
    } else {
      results = await baseQuery;
    }

    return results.map(result => ({
      ...result.requests,
      patient: result.patients!,
      doctor: result.users!,
      healthUnit: result.health_units!,
      examType: result.exam_types || undefined,
      consultationType: result.consultation_types || undefined,
    }));
  }

  async createRequest(request: InsertRequest): Promise<Request> {
    const [newRequest] = await db.insert(requests).values(request).returning();
    return newRequest;
  }

  async updateRequestStatus(id: number, status: string, registrarId?: number): Promise<Request> {
    const updateData: any = { status, updatedAt: new Date() };
    if (registrarId) updateData.registrarId = registrarId;
    if (status === 'completed') updateData.completedDate = new Date();

    const [updatedRequest] = await db
      .update(requests)
      .set(updateData)
      .where(eq(requests.id, id))
      .returning();
    return updatedRequest;
  }

  async getSuspendedRequestsByUser(userId: number): Promise<RequestWithRelations[]> {
    const results = await db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .where(and(
        eq(requests.status, 'suspenso'),
        eq(requests.doctorId, userId)
      ))
      .orderBy(desc(requests.createdAt));

    return results.map(result => ({
      ...result.requests,
      patient: result.patients!,
      doctor: result.users!,
      healthUnit: result.health_units!,
      examType: result.exam_types || undefined,
      consultationType: result.consultation_types || undefined,
    }));
  }

  async updateRequestAttachment(id: number, attachmentData: {
    attachmentFileName: string;
    attachmentFileSize: number;
    attachmentMimeType: string;
    attachmentUploadedAt: Date;
    attachmentUploadedBy: number | null;
  }): Promise<Request> {
    const [updatedRequest] = await db
      .update(requests)
      .set({
        attachmentFileName: attachmentData.attachmentFileName,
        attachmentFileSize: attachmentData.attachmentFileSize,
        attachmentMimeType: attachmentData.attachmentMimeType,
        attachmentUploadedAt: attachmentData.attachmentUploadedAt,
        attachmentUploadedBy: attachmentData.attachmentUploadedBy,
        updatedAt: new Date(),
      })
      .where(eq(requests.id, id))
      .returning();
    return updatedRequest;
  }

  async updateRequestAdditionalDocument(id: number, additionalDocData: {
    additionalDocumentFileName: string;
    additionalDocumentFileSize: number;
    additionalDocumentMimeType: string;
    additionalDocumentUploadedAt: Date;
    additionalDocumentUploadedBy: number | null;
  }): Promise<Request> {
    const [updatedRequest] = await db
      .update(requests)
      .set({
        additionalDocumentFileName: additionalDocData.additionalDocumentFileName,
        additionalDocumentFileSize: additionalDocData.additionalDocumentFileSize,
        additionalDocumentMimeType: additionalDocData.additionalDocumentMimeType,
        additionalDocumentUploadedAt: additionalDocData.additionalDocumentUploadedAt,
        additionalDocumentUploadedBy: additionalDocData.additionalDocumentUploadedBy,
        updatedAt: new Date(),
      })
      .where(eq(requests.id, id))
      .returning();
    return updatedRequest;
  }

  async getUrgentRequests(): Promise<RequestWithRelations[]> {
    // Get urgent requests excluding suspended and "Aguardando Análise"
    const results = await db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .where(
        and(
          eq(requests.isUrgent, true),
          ne(requests.status, 'suspenso'),
          ne(requests.status, 'Aguardando Análise')
        )
      )
      .orderBy(desc(requests.createdAt));

    return results.map(result => ({
      ...result.requests,
      patient: result.patients!,
      doctor: result.users!,
      healthUnit: result.health_units!,
      examType: result.exam_types || undefined,
      consultationType: result.consultation_types || undefined,
    }));
  }

  async getRequestById(id: number): Promise<RequestWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .where(eq(requests.id, id));

    if (!result) return undefined;

    return {
      ...result.requests,
      patient: result.patients!,
      doctor: result.users!,
      healthUnit: result.health_units!,
      examType: result.exam_types || undefined,
      consultationType: result.consultation_types || undefined,
    };
  }

  async deleteRequest(id: number): Promise<void> {
    await db.delete(requests).where(eq(requests.id, id));
  }

  async completeRequestWithResult(id: number, completionData: {
    examLocation: string;
    examDate: string;
    examTime: string;
    resultFileName: string;
    resultFileSize: number;
    resultMimeType: string;
    resultUploadedAt: Date;
    resultUploadedBy: number;
  }): Promise<Request> {
    const [updatedRequest] = await db
      .update(requests)
      .set({
        status: 'completed',
        completedDate: new Date(),
        examLocation: completionData.examLocation,
        examDate: completionData.examDate,
        examTime: completionData.examTime,
        resultFileName: completionData.resultFileName,
        resultFileSize: completionData.resultFileSize,
        resultMimeType: completionData.resultMimeType,
        resultUploadedAt: completionData.resultUploadedAt,
        resultUploadedBy: completionData.resultUploadedBy,
        updatedAt: new Date(),
      })
      .where(eq(requests.id, id))
      .returning();
    return updatedRequest;
  }

  // Dashboard stats
  async getRequestStats(year?: number, month?: number): Promise<{
    received: number;
    accepted: number;
    confirmed: number;
    completed: number;
  }> {
    console.log(`🔍 getRequestStats called - Year: ${year}, Month: ${month}`);
    
    let query = db
      .select({
        status: requests.status,
        count: count(),
      })
      .from(requests);

    // Apply date filters if provided
    if (year && month) {
      const startDate = new Date(year, month - 1, 1); // month - 1 because JS months are 0-indexed
      const endDate = new Date(year, month, 0); // Last day of the month
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`🔍 Filtering by date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Since we now change the creation date when forwarding, we only need to filter by creation date
      query = query.where(
        and(
          gte(requests.createdAt, startDate),
          lte(requests.createdAt, endDate)
        )
      );
    }

    const stats = await query.groupBy(requests.status);
    console.log(`🔍 Raw stats from database:`, stats);

    const result = {
      received: 0,
      accepted: 0,
      confirmed: 0,
      completed: 0,
    };

    stats.forEach(stat => {
      // EXCLUDE suspended and "Aguardando Análise" from stats completely
      if (stat.status === 'suspenso' || stat.status === 'Aguardando Análise' || stat.status === 'falha') {
        return; // Skip these completely
      }
      
      // Map Portuguese status to English for compatibility
      const statusMapping: { [key: string]: keyof typeof result } = {
        'Aceito': 'accepted',
        'Confirmado': 'confirmed',
        'Finalizado': 'completed',
        'received': 'received',
        'accepted': 'accepted',
        'confirmed': 'confirmed',
        'completed': 'completed'
      };
      
      const mappedStatus = statusMapping[stat.status];
      if (mappedStatus) {
        result[mappedStatus] = stat.count;
      }
    });

    return result;
  }



  // Spending statistics
  async getMonthlySpending(year?: number, month?: number, statusFilter?: string[]): Promise<Array<{
    type: 'exam' | 'consultation';
    name: string;
    totalRequests: number;
    unitPrice: number;
    totalSpent: number;
  }>> {
    const now = new Date();
    const targetYear = year !== undefined ? year : now.getFullYear();
    // Convert frontend month (1-12) to JavaScript month (0-11)
    const targetMonth = month !== undefined ? month - 1 : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    console.log(`=== MONTHLY SPENDING DEBUG ===`);
    console.log(`Buscando gastos para ${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`);
    console.log(`Período: ${startOfMonth.toISOString()} até ${endOfMonth.toISOString()}`);

    // First, let's check what requests exist in this period
    // Since we now change the creation date when forwarding, we only need to filter by creation date
    const allRequestsInPeriod = await db
      .select({
        id: requests.id,
        status: requests.status,
        examTypeId: requests.examTypeId,
        consultationTypeId: requests.consultationTypeId,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .where(
        and(
          gte(requests.createdAt, startOfMonth),
          lte(requests.createdAt, endOfMonth)
        )
      )
      .orderBy(requests.createdAt);

    console.log(`Total de requisições no período: ${allRequestsInPeriod.length}`);
    console.log('Requisições encontradas:', allRequestsInPeriod.map(r => ({
      id: r.id,
      status: r.status,
      examTypeId: r.examTypeId,
      consultationTypeId: r.consultationTypeId,
      date: r.createdAt?.toISOString()
    })));

    // Count processed requests by status
    const statusCounts = allRequestsInPeriod.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Contagem por status:', statusCounts);

    // Filter requests based on statusFilter parameter
    // Since we now change the creation date when forwarding, we only need to filter by creation date
    let whereConditions = [
      gte(requests.createdAt, startOfMonth),
      lte(requests.createdAt, endOfMonth)
    ];

    if (statusFilter && statusFilter.length > 0) {
      // Use IN operator for multiple statuses - more robust approach
      whereConditions.push(inArray(requests.status, statusFilter));
      console.log('Filtro de status aplicado:', statusFilter);
    } else {
      // Default behavior: exclude pending approval
      whereConditions.push(ne(requests.status, 'Aguardando Análise'));
      console.log('Filtro padrão aplicado: excluindo "Aguardando Análise"');
    }

    const processedRequests = await db
      .select({
        id: requests.id,
        status: requests.status,
        examTypeId: requests.examTypeId,
        consultationTypeId: requests.consultationTypeId,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .where(and(...whereConditions));

    console.log('Requisições processadas no período:', processedRequests.length);
    console.log('=== DEBUG: Filtro de requisições ===');
    console.log('StatusFilter recebido:', statusFilter);
    console.log('Where conditions:', whereConditions.length, 'condições');
    processedRequests.forEach(req => {
      console.log(`- ID: ${req.id}, Status: ${req.status}, ExamTypeId: ${req.examTypeId}, ConsultationTypeId: ${req.consultationTypeId}`);
    });
    console.log('=== FIM DEBUG ===');

    // Get exam types and count processed exam requests
    const allExamTypes = await db.select().from(examTypes).where(eq(examTypes.isActive, true));
    const examResults = [];

    for (const examType of allExamTypes) {
      const examRequestsCount = processedRequests.filter(req => req.examTypeId === examType.id).length;
      if (examRequestsCount > 0) {
        examResults.push({
          examTypeId: examType.id,
          name: examType.name,
          price: examType.price,
          count: examRequestsCount,
        });
      }
    }

    console.log('Resultados de exames (raw):', examResults);

    // Get consultation types and count processed consultation requests
    const allConsultationTypes = await db.select().from(consultationTypes).where(eq(consultationTypes.isActive, true));
    const consultationResults = [];

    for (const consultationType of allConsultationTypes) {
      const consultationRequestsCount = processedRequests.filter(req => req.consultationTypeId === consultationType.id).length;
      if (consultationRequestsCount > 0) {
        consultationResults.push({
          consultationTypeId: consultationType.id,
          name: consultationType.name,
          price: consultationType.price,
          count: consultationRequestsCount,
        });
      }
    }

    console.log('Resultados de consultas (raw):', consultationResults);

    // Build final result
    const result: Array<{
      type: 'exam' | 'consultation';
      name: string;
      totalRequests: number;
      unitPrice: number;
      totalSpent: number;
    }> = [];

    // Process exam results
    for (const examResult of examResults) {
      const totalRequests = Number(examResult.count);
      const unitPrice = Number(examResult.price) || 0;
      result.push({
        type: 'exam',
        name: examResult.name,
        totalRequests,
        unitPrice,
        totalSpent: totalRequests * unitPrice,
      });
    }

    // Process consultation results
    for (const consultationResult of consultationResults) {
      const totalRequests = Number(consultationResult.count);
      const unitPrice = Number(consultationResult.price) || 0;
      result.push({
        type: 'consultation',
        name: consultationResult.name,
        totalRequests,
        unitPrice,
        totalSpent: totalRequests * unitPrice,
      });
    }

    console.log('=== RESULTADO FINAL DOS GASTOS ===');
    console.log(JSON.stringify(result, null, 2));
    console.log(`Total de itens retornados: ${result.length}`);
    console.log(`Valor total gasto: R$ ${result.reduce((sum, item) => sum + item.totalSpent, 0) / 100}`);
    console.log('=== FIM DEBUG ===');

    return result;
  }

  async getMonthlyQuotaUsage(year?: number, month?: number): Promise<Array<{
    type: 'exam' | 'consultation';
    name: string;
    quota: number;
    used: number;
  }>> {
    const now = new Date();
    const targetYear = year !== undefined ? year : now.getFullYear();
    // Convert frontend month (1-12) to JavaScript month (0-11)
    const targetMonth = month !== undefined ? month - 1 : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    console.log(`=== QUOTA USAGE DEBUG ===`);
    console.log(`Buscando uso de cota para ${targetYear}-${targetMonth + 1}`);
    console.log(`Período: ${startOfMonth.toISOString()} até ${endOfMonth.toISOString()}`);

    // Verificar se existem tipos de exames ativos
    const allExamTypes = await db.select().from(examTypes).where(eq(examTypes.isActive, true));
    console.log(`Total de tipos de exames ativos: ${allExamTypes.length}`);
    console.log('Tipos de exames:', allExamTypes.map(e => ({ id: e.id, name: e.name, quota: e.monthlyQuota })));

    // Get exam usage
    const examUsage = await db
      .select({
        id: examTypes.id,
        name: examTypes.name,
        quota: examTypes.monthlyQuota,
        used: count(requests.id),
      })
      .from(examTypes)
      .leftJoin(requests, and(
        eq(requests.examTypeId, examTypes.id),
        gte(requests.createdAt, startOfMonth),
        lte(requests.createdAt, endOfMonth),
        ne(requests.status, 'Aguardando Análise') // Apenas requisições processadas
      ))
      .where(eq(examTypes.isActive, true))
      .groupBy(examTypes.id, examTypes.name, examTypes.monthlyQuota);

    console.log('Uso de exames (raw):', examUsage);

    // Verificar se existem tipos de consultas ativos
    const allConsultationTypes = await db.select().from(consultationTypes).where(eq(consultationTypes.isActive, true));
    console.log(`Total de tipos de consultas ativos: ${allConsultationTypes.length}`);
    console.log('Tipos de consultas:', allConsultationTypes.map(c => ({ id: c.id, name: c.name, quota: c.monthlyQuota })));

    // Get consultation usage
    const consultationUsage = await db
      .select({
        id: consultationTypes.id,
        name: consultationTypes.name,
        quota: consultationTypes.monthlyQuota,
        used: count(requests.id),
      })
      .from(consultationTypes)
      .leftJoin(requests, and(
        eq(requests.consultationTypeId, consultationTypes.id),
        gte(requests.createdAt, startOfMonth),
        lte(requests.createdAt, endOfMonth),
        ne(requests.status, 'Aguardando Análise') // Apenas requisições processadas
      ))
      .where(eq(consultationTypes.isActive, true))
      .groupBy(consultationTypes.id, consultationTypes.name, consultationTypes.monthlyQuota);

    console.log('Uso de consultas (raw):', consultationUsage);

    const result = [
      ...examUsage.map(exam => ({
        type: 'exam' as const,
        name: exam.name,
        quota: exam.quota,
        used: exam.used,
      })),
      ...consultationUsage.map(consultation => ({
        type: 'consultation' as const,
        name: consultation.name,
        quota: consultation.quota,
        used: consultation.used,
      })),
    ];

    console.log('=== RESULTADO FINAL DAS COTAS ===');
    console.log(JSON.stringify(result, null, 2));
    console.log(`Total de itens de cota retornados: ${result.length}`);
    console.log('=== FIM DEBUG COTAS ===');

    return result;
  }

  async getAvailableMonths(): Promise<Array<{
    year: number;
    month: number;
    monthName: string;
    totalRequests: number;
  }>> {
    const results = await db
      .select({
        year: sql<number>`extract(year from ${requests.createdAt})`,
        month: sql<number>`extract(month from ${requests.createdAt})`,
        totalRequests: count(requests.id),
      })
      .from(requests)
      .groupBy(
        sql`extract(year from ${requests.createdAt})`,
        sql`extract(month from ${requests.createdAt})`
      )
      .orderBy(
        desc(sql`extract(year from ${requests.createdAt})`),
        desc(sql`extract(month from ${requests.createdAt})`)
      );

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return results.map(result => ({
      year: Number(result.year),
      month: Number(result.month) - 1, // JavaScript months are 0-indexed
      monthName: monthNames[Number(result.month) - 1],
      totalRequests: result.totalRequests,
    }));
  }

  // Users by role
  async getUsersByRole(role: string): Promise<User[]> {
    if (role) {
      return await db
        .select()
        .from(users)
        .where(and(eq(users.role, role), eq(users.isActive, true)));
    } else {
      // Return all active users if no role specified
      return await db
        .select()
        .from(users)
        .where(eq(users.isActive, true));
    }
  }

  async getUsersInHealthUnit(healthUnitId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.healthUnitId, healthUnitId), eq(users.isActive, true)));
  }

  // Secretary functions
  async getPendingSecretaryRequests(month?: number, year?: number, includeForwarded?: boolean, forwardedMonth?: number, forwardedYear?: number, includeReceived?: boolean, futureMonthOnly?: boolean): Promise<RequestWithRelations[]> {
    console.log(`Buscando requisições do secretário... ${includeReceived ? '(incluindo recebidas)' : '(apenas pendentes)'}`);

    // Build filter conditions - include both pending and received if requested
    const statusConditions = includeReceived 
      ? or(eq(requests.status, 'Aguardando Análise'), eq(requests.status, 'received'))
      : eq(requests.status, 'Aguardando Análise');
    
    const conditions = [statusConditions];
    
    // Since we now change creation date when forwarding, we only need to filter by creation date
    if (month && year) {
      console.log(`Filtering by creation month: ${month}, year: ${year}`);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month - 1 + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      conditions.push(
        gte(requests.createdAt, startDate),
        lte(requests.createdAt, endDate)
      );
    }

    const results = await db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .where(and(...conditions))
      .orderBy(desc(requests.isUrgent), desc(requests.createdAt));

    console.log(`Found ${results.length} pending secretary requests`);
    if (results.length > 0) {
      console.log(`First request: ID ${results[0].requests.id}, Status: ${results[0].requests.status}, CreatedAt: ${results[0].requests.createdAt}`);
      
      // Debug: Count status types in result
      const statusCounts = results.reduce((acc, row) => {
        const status = row.requests.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`Status breakdown:`, statusCounts);
    }

    return results.map(row => ({
      ...row.requests,
      patient: row.patients!,
      doctor: row.users!,
      healthUnit: row.health_units!,
      examType: row.exam_types || undefined,
      consultationType: row.consultation_types || undefined,
    })) as RequestWithRelations[];
  }

  async approveSecretaryRequest(requestId: number): Promise<Request> {
    const [request] = await db
      .update(requests)
      .set({ status: 'received' })
      .where(eq(requests.id, requestId))
      .returning();
    return request;
  }

  async rejectSecretaryRequest(requestId: number): Promise<Request> {
    // Get the request before deleting it
    const [request] = await db
      .select()
      .from(requests)
      .where(eq(requests.id, requestId));

    if (!request) {
      throw new Error('Request not found');
    }

    // Delete the request from the database
    await db
      .delete(requests)
      .where(eq(requests.id, requestId));

    return request;
  }

  async getSecretaryDashboardStats(): Promise<{
    totalRequests: number;
    pendingApproval: number;
    approvedToday: number;
    rejectedToday: number;
    urgentPending: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count total requests
    const [totalResult] = await db
      .select({ count: count(requests.id) })
      .from(requests);

    // Count pending approval
    const [pendingResult] = await db
      .select({ count: count(requests.id) })
      .from(requests)
      .where(eq(requests.status, 'Aguardando Análise'));

    // Count urgent pending
    const [urgentResult] = await db
      .select({ count: count(requests.id) })
      .from(requests)
      .where(and(
        eq(requests.status, 'Aguardando Análise'),
        eq(requests.isUrgent, true)
      ));

    // Count approved today (status changed from 'Aguardando Análise' to 'received')
    const [approvedResult] = await db
      .select({ count: count(requests.id) })
      .from(requests)
      .where(and(
        eq(requests.status, 'received'),
        gte(requests.updatedAt, today),
        lt(requests.updatedAt, tomorrow)
      ));

    return {
      totalRequests: totalResult.count,
      pendingApproval: pendingResult.count,
      approvedToday: approvedResult.count,
      rejectedToday: 0, // Rejeitadas são deletadas, então não conseguimos contar
      urgentPending: urgentResult.count,
    };
  }

  async getSecretaryRecentActivity(): Promise<any[]> {
    try {
      const activity = await db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          userName: activityLogs.userName,
          userRole: activityLogs.userRole,
          action: activityLogs.action,
          actionDescription: activityLogs.actionDescription,
          requestType: activityLogs.requestType,
          patientName: activityLogs.patientName,
          requestName: activityLogs.requestName,
          oldStatus: activityLogs.oldStatus,
          newStatus: activityLogs.newStatus,
          date: activityLogs.createdAt,
          isUrgent: sql<boolean>`false`, // Placeholder, would need to join with requests if needed
        })
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(15);

      return activity;
    } catch (error) {
      console.error('Erro ao buscar atividade recente do secretário:', error);
      return [];
    }
  }

  // Patient search by CPF
  async getPatientByCpf(cpf: string): Promise<Patient | undefined> {
    // Normalize the search CPF (remove all non-digits)
    const normalizedSearchCpf = cpf.replace(/\D/g, '');
    
    // Search using SQL to normalize both CPFs for comparison
    const [patient] = await db
      .select()
      .from(patients)
      .where(
        sql`REPLACE(REPLACE(REPLACE(${patients.cpf}, '.', ''), '-', ''), ' ', '') = ${normalizedSearchCpf}`
      );
    
    return patient || undefined;
  }

  async getPatientRequestsByCpf(cpf: string): Promise<{ patient: Patient; requests: RequestWithRelations[] } | undefined> {
    const patient = await this.getPatientByCpf(cpf);
    if (!patient) return undefined;

    const results = await db
      .select()
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(users, eq(requests.doctorId, users.id))
      .leftJoin(healthUnits, eq(requests.healthUnitId, healthUnits.id))
      .leftJoin(examTypes, eq(requests.examTypeId, examTypes.id))
      .leftJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
      .where(eq(requests.patientId, patient.id))
      .orderBy(desc(requests.createdAt));

    const patientRequests = results.map(row => ({
      ...row.requests,
      patient: row.patients!,
      doctor: row.users!,
      registrar: undefined, // Will be populated later
      healthUnit: row.health_units!,
      examType: row.exam_types || undefined,
      consultationType: row.consultation_types || undefined,
    })) as RequestWithRelations[];

    // Get registrars for each request that has one
    for (const request of patientRequests) {
      if (request.registrarId) {
        const registrar = await this.getUser(request.registrarId);
        request.registrar = registrar;
      }
    }

    return {
      patient,
      requests: patientRequests
    };
  }

  // Activity logs
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    try {
      const [log] = await db.insert(activityLogs).values({
        ...logData,
        createdAt: new Date()
      }).returning();
      return log;
    } catch (error) {
      console.error('Erro ao criar log de atividade:', error);
      throw error;
    }
  }

  async getActivityLogs(limit = 100, filters?: {
    userId?: number;
    action?: string;
    requestType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ActivityLog[]> {
    try {
      let query = db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt));

      const conditions = [];

      if (filters?.userId) {
        conditions.push(eq(activityLogs.userId, filters.userId));
      }

      if (filters?.action) {
        conditions.push(eq(activityLogs.action, filters.action));
      }

      if (filters?.requestType) {
        conditions.push(eq(activityLogs.requestType, filters.requestType));
      }

      if (filters?.startDate) {
        conditions.push(gte(activityLogs.createdAt, filters.startDate));
      }

      if (filters?.endDate) {
        conditions.push(lte(activityLogs.createdAt, filters.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.limit(limit);
    } catch (error) {
      console.error('Erro ao buscar logs de atividade:', error);
      throw error;
    }
  }

  async getActivityStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalActivities: number;
    activitiesByType: { [key: string]: number };
    activitiesByUser: { [key: string]: number };
    activitiesByDay: { [key: string]: number };
  }> {
    try {
      const conditions = [];

      if (startDate) {
        conditions.push(gte(activityLogs.createdAt, startDate));
      }

      if (endDate) {
        conditions.push(lte(activityLogs.createdAt, endDate));
      }

      let baseQuery = db.select().from(activityLogs);

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const logs = await baseQuery;

      const stats = {
        totalActivities: logs.length,
        activitiesByType: {} as { [key: string]: number },
        activitiesByUser: {} as { [key: string]: number },
        activitiesByDay: {} as { [key: string]: number }
      };

      logs.forEach(log => {
        // Por tipo de ação
        stats.activitiesByType[log.action] = (stats.activitiesByType[log.action] || 0) + 1;

        // Por usuário
        stats.activitiesByUser[log.userName] = (stats.activitiesByUser[log.userName] || 0) + 1;

        // Por dia
        const day = log.createdAt?.toISOString().split('T')[0] || 'unknown';
        stats.activitiesByDay[day] = (stats.activitiesByDay[day] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Erro ao gerar estatísticas de atividade:', error);
      throw error;
    }
  }

  async getMonthlyAuthorizationsReport(year?: number, month?: number): Promise<{
    period: string;
    summary: {
      totalAuthorized: number;
      examsAuthorized: number;
      consultationsAuthorized: number;
      totalValue: number;
    };
    byType: Array<{
      type: 'exam' | 'consultation';
      name: string;
      authorized: number;
      unitPrice: number;
      totalValue: number;
    }>;
    byDoctor: Array<{
      doctorName: string;
      exams: number;
      consultations: number;
      total: number;
    }>;
    bySecretary: Array<{
      secretaryName: string;
      approved: number;
      rejected: number;
    }>;
    activities: Array<{
      date: string;
      action: string;
      userName: string;
      userRole: string;
      patientName: string;
      requestType: string;
      requestName: string;
      description: string;
    }>;
  }> {
    try {
      const now = new Date();
      const targetYear = year !== undefined ? year : now.getFullYear();
      const targetMonth = month !== undefined ? month : now.getMonth();

      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      console.log(`Gerando relatório para ${targetYear}-${targetMonth + 1} (${startOfMonth.toISOString()} até ${endOfMonth.toISOString()})`);

      // Get authorized requests (completed, confirmed, accepted, received)
      const authorizedExams = await db
        .select({
          id: requests.id,
          name: examTypes.name,
          price: examTypes.price,
          doctorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          patientName: patients.name,
          createdAt: requests.createdAt,
        })
        .from(requests)
        .innerJoin(examTypes, eq(requests.examTypeId, examTypes.id))
        .innerJoin(users, eq(requests.doctorId, users.id))
        .innerJoin(patients, eq(requests.patientId, patients.id))
        .where(
          and(
            gte(requests.createdAt, startOfMonth),
            lte(requests.createdAt, endOfMonth),
            or(
              eq(requests.status, 'completed'),
              eq(requests.status, 'confirmed'),
              eq(requests.status, 'accepted'),
              eq(requests.status, 'received')
            )
          )
        );

      const authorizedConsultations = await db
        .select({
          id: requests.id,
          name: consultationTypes.name,
          price: consultationTypes.price,
          doctorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          patientName: patients.name,
          createdAt: requests.createdAt,
        })
        .from(requests)
        .innerJoin(consultationTypes, eq(requests.consultationTypeId, consultationTypes.id))
        .innerJoin(users, eq(requests.doctorId, users.id))
        .innerJoin(patients, eq(requests.patientId, patients.id))
        .where(
          and(
            gte(requests.createdAt, startOfMonth),
            lte(requests.createdAt, endOfMonth),
            or(
              eq(requests.status, 'completed'),
              eq(requests.status, 'confirmed'),
              eq(requests.status, 'accepted'),
              eq(requests.status, 'received')
            )
          )
        );

      // Get activity logs
      const logs = await db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          actionDescription: activityLogs.actionDescription,
          userName: activityLogs.userName,
          userRole: activityLogs.userRole,
          createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .where(
          and(
            gte(activityLogs.createdAt, startOfMonth),
            lte(activityLogs.createdAt, endOfMonth)
          )
        )
        .orderBy(activityLogs.createdAt);

      // Calculate summary
      const totalExams = authorizedExams.length;
      const totalConsultations = authorizedConsultations.length;
      const totalAuthorized = totalExams + totalConsultations;

      const totalExamValue = authorizedExams.reduce((sum, exam) => sum + exam.price, 0);
      const totalConsultationValue = authorizedConsultations.reduce((sum, consultation) => sum + consultation.price, 0);
      const totalValue = totalExamValue + totalConsultationValue;

      // Group by type
      const examsByType = authorizedExams.reduce((acc, exam) => {
        const existing = acc.find(item => item.name === exam.name);
        if (existing) {
          existing.authorized++;
          existing.totalValue += exam.price;
        } else {
          acc.push({
            type: 'exam' as const,
            name: exam.name,
            authorized: 1,
            unitPrice: exam.price,
            totalValue: exam.price,
          });
        }
        return acc;
      }, [] as Array<{ type: 'exam' | 'consultation'; name: string; authorized: number; unitPrice: number; totalValue: number; }>);

      const consultationsByType = authorizedConsultations.reduce((acc, consultation) => {
        const existing = acc.find(item => item.name === consultation.name);
        if (existing) {
          existing.authorized++;
          existing.totalValue += consultation.price;
        } else {
          acc.push({
            type: 'consultation' as const,
            name: consultation.name,
            authorized: 1,
            unitPrice: consultation.price,
            totalValue: consultation.price,
          });
        }
        return acc;
      }, [] as Array<{ type: 'exam' | 'consultation'; name: string; authorized: number; unitPrice: number; totalValue: number; }>);

      const byType = [...examsByType, ...consultationsByType];

      // Group by doctor
      const byDoctor = [...authorizedExams, ...authorizedConsultations].reduce((acc, item) => {
        const existing = acc.find(doctor => doctor.doctorName === item.doctorName);
        const isExam = authorizedExams.some(exam => exam.id === item.id);

        if (existing) {
          if (isExam) {
            existing.exams++;
          } else {
            existing.consultations++;
          }
          existing.total++;
        } else {
          acc.push({
            doctorName: item.doctorName,
            exams: isExam ? 1 : 0,
            consultations: isExam ? 0 : 1,
            total: 1,
          });
        }
        return acc;
      }, [] as Array<{ doctorName: string; exams: number; consultations: number; total: number; }>);

      // Group by secretary (from activity logs)
      const bySecretary = logs
        .filter(log => log.userRole === 'secretario' && (log.action === 'approved' || log.action === 'rejected'))
        .reduce((acc, log) => {
          const existing = acc.find(secretary => secretary.secretaryName === log.userName);
          if (existing) {
            if (log.action === 'approved') {
              existing.approved++;
            } else {
              existing.rejected++;
            }
          } else {
            acc.push({
              secretaryName: log.userName,
              approved: log.action === 'approved' ? 1 : 0,
              rejected: log.action === 'rejected' ? 1 : 0,
            });
          }
          return acc;
        }, [] as Array<{ secretaryName: string; approved: number; rejected: number; }>);

      // Format activities
      const activities = logs.map(log => ({
        date: log.createdAt.toISOString(),
        action: log.action,
        userName: log.userName,
        userRole: log.userRole,
        patientName: '',
        requestType: '',
        requestName: '',
        description: log.actionDescription,
      }));

      const result = {
        period: `${monthNames[targetMonth]} ${targetYear}`,
        summary: {
          totalAuthorized,
          examsAuthorized: totalExams,
          consultationsAuthorized: totalConsultations,
          totalValue,
        },
        byType,
        byDoctor,
        bySecretary,
        activities,
      };

      console.log('Relatório gerado:', result);
      return result;

    } catch (error) {
      console.error('Erro ao gerar relatório mensal:', error);
      // Return empty structure instead of throwing
      return {
        period: 'N/A',
        summary: {
          totalAuthorized: 0,
          examsAuthorized: 0,
          consultationsAuthorized: 0,
          totalValue: 0,
        },
        byType: [],
        byDoctor: [],
        bySecretary: [],
        activities: [],
      };
    }
  }

  // Notification methods
  async getNotifications(role?: string): Promise<Notification[]> {
    try {
      let query = db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));

      if (role) {
        query = query.where(
          or(
            eq(notifications.targetRole, role),
            eq(notifications.targetRole, null)
          )
        );
      }

      return await query;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  async getActiveNotifications(role?: string): Promise<Notification[]> {
    try {
      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.isActive, true))
        .orderBy(desc(notifications.createdAt));

      if (role) {
        query = query.where(
          and(
            eq(notifications.isActive, true),
            or(
              eq(notifications.targetRole, role),
              eq(notifications.targetRole, null)
            )
          )
        );
      }

      return await query;
    } catch (error) {
      console.error('Erro ao buscar notificações ativas:', error);
      throw error;
    }
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          ...notificationData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return notification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  async updateNotification(id: number, notificationData: Partial<InsertNotification>): Promise<Notification> {
    try {
      const [notification] = await db
        .update(notifications)
        .set({
          ...notificationData,
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, id))
        .returning();
      return notification;
    } catch (error) {
      console.error('Erro ao atualizar notificação:', error);
      throw error;
    }
  }

  async deleteNotification(id: number): Promise<void> {
    try {
      await db.delete(notifications).where(eq(notifications.id, id));
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      throw error;
    }
  }

  async toggleNotificationStatus(id: number): Promise<Notification> {
    try {
      const [currentNotification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id));

      if (!currentNotification) {
        throw new Error('Notificação não encontrada');
      }

      const [notification] = await db
        .update(notifications)
        .set({
          isActive: !currentNotification.isActive,
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, id))
        .returning();

      return notification;
    } catch (error) {
      console.error('Erro ao alternar status da notificação:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();