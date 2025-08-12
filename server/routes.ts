import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, isAdmin, hashPassword, verifyPassword, createDefaultAdmin } from "./localAuth";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { insertPatientSchema, insertRequestSchema, insertHealthUnitSchema, insertExamTypeSchema, insertConsultationTypeSchema, insertNotificationSchema, requests, patients, users, healthUnits, examTypes, consultationTypes } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { exec } from "child_process";
import { promisify } from "util";
import { db, pool } from "./db";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for PDF uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `request-${uniqueSuffix}-${file.originalname}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      console.log('Validando arquivo principal:', file.originalname, 'Tipo:', file.mimetype);
      
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      // Prioritize file extension validation over MIME type
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
      
      if (allowedExtensions.includes(ext)) {
        console.log('Arquivo aceito por extensão:', ext);
        cb(null, true);
        return;
      }
      
      // Fallback: check by MIME type
      if (allowedTypes.includes(file.mimetype)) {
        console.log('Arquivo aceito por MIME type:', file.mimetype);
        cb(null, true);
        return;
      }
      
      console.log('Arquivo rejeitado - tipo não permitido:', file.originalname, file.mimetype, ext);
      cb(new Error('Apenas arquivos PDF, JPG e PNG são permitidos'));
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Configure multer for ID photo uploads
  const uploadPhoto = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const photoType = req.body.photoType || 'id';
        cb(null, `${photoType}-${uniqueSuffix}-${file.originalname}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos de imagem são permitidos'));
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit for images
    }
  });

  // Configure multer for additional documents (more flexible file types)
  const uploadAdditionalDoc = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'additional-doc-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      console.log('Validando arquivo adicional:', file.originalname, 'Tipo:', file.mimetype);
      
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      // Prioritize file extension validation over MIME type
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.txt', '.xls', '.xlsx'];
      
      if (allowedExtensions.includes(ext)) {
        console.log('Arquivo adicional aceito por extensão:', ext);
        cb(null, true);
        return;
      }
      
      // Fallback: check by MIME type
      if (allowedTypes.includes(file.mimetype)) {
        console.log('Arquivo adicional aceito por MIME type:', file.mimetype);
        cb(null, true);
        return;
      }

      console.log('Arquivo adicional rejeitado:', file.originalname, file.mimetype, ext);
      cb(new Error('Tipo de arquivo não permitido. Use PDF, JPG, PNG, DOC, DOCX, TXT, XLS ou XLSX'));
    },
    limits: {
      fileSize: 15 * 1024 * 1024 // 15MB limit
    }
  });

  // Configure session
  const sessionTtl = 5 * 60 * 60 * 1000; // 5 hours
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "default-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Keep false for server installation without HTTPS
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  }));

  // Create default admin user
  await createDefaultAdmin();

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username e senha são obrigatórios" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !await verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Usuário inativo" });
      }

      (req.session as any).userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password in database
      await storage.updateUser(userId, { password: hashedNewPassword });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // Login route - handles both replit auth and local auth
  app.get("/api/login", (req, res) => {
    // Always redirect to local login for server installation
    res.redirect("/login");
  });

  // Logout GET route for direct navigation
  app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });

  // Update profile route
  app.put('/api/auth/update-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const { username, email, firstName, lastName, password } = req.body;

      console.log('Update profile request:', { userId, username, email, firstName, lastName, hasPassword: !!password });

      // Get current user to check for conflicts
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      console.log('Current user:', { id: currentUser.id, username: currentUser.username, email: currentUser.email });

      // Check if username is being changed and if it already exists
      if (username && username.trim() && username !== currentUser.username) {
        console.log('Username is being changed from', currentUser.username, 'to', username);
        const existingUser = await storage.getUserByUsername(username);
        console.log('Existing user check:', existingUser ? { id: existingUser.id, username: existingUser.username } : 'not found');
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Nome de usuário já está em uso" });
        }
      }

      const updateData: any = {};

      // Always include firstName and lastName
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

      // Only update username if it's different
      if (username && username.trim() && username !== currentUser.username) {
        updateData.username = username;
      }

      // Only update email if it's different
      if (email && email.trim() && email !== currentUser.email) {
        updateData.email = email;
      }

      if (password && password.trim()) {
        updateData.password = await hashPassword(password);
      }

      console.log('Update data:', Object.keys(updateData));

      const updatedUser = await storage.updateUser(userId, updateData);

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin-only user registration
  app.post('/api/auth/register', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userData = req.body;

      // Validate required fields
      if (!userData.username || !userData.password || !userData.email || !userData.firstName || !userData.lastName || !userData.role) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userData = req.body;

      // Validate required fields
      if (!userData.username || !userData.password || !userData.email || !userData.firstName || !userData.lastName || !userData.role) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  // Get all users (admin and secretary)
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getUsersByRole(req.query.role as string);
      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Update user (admin and secretary)
  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      const updateData = req.body;

      // Remove timestamp fields that should be auto-managed
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Convert healthUnitId to number if provided
      if (updateData.healthUnitId) {
        updateData.healthUnitId = parseInt(updateData.healthUnitId);
      }

      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      } else {
        // Remove password field if not provided (don't update it)
        delete updateData.password;
      }

      // Get original user data before update for comparison
      const originalUser = await storage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Create activity log for user update
      const adminName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const roleDisplay = user.role === 'admin' ? 'Administrador' : user.role;
      
      // Generate description of changes
      const changes = [];
      if (updateData.firstName && updateData.firstName !== originalUser.firstName) {
        changes.push(`nome alterado para "${updateData.firstName}"`);
      }
      if (updateData.lastName && updateData.lastName !== originalUser.lastName) {
        changes.push(`sobrenome alterado para "${updateData.lastName}"`);
      }
      if (updateData.email && updateData.email !== originalUser.email) {
        changes.push(`email alterado para "${updateData.email}"`);
      }
      if (updateData.role && updateData.role !== originalUser.role) {
        changes.push(`função alterada de "${originalUser.role}" para "${updateData.role}"`);
      }
      if (updateData.healthUnitId && updateData.healthUnitId !== originalUser.healthUnitId) {
        changes.push(`unidade de saúde alterada`);
      }
      if (updateData.password) {
        changes.push(`senha redefinida`);
      }
      if (updateData.isActive !== undefined && updateData.isActive !== originalUser.isActive) {
        changes.push(`status alterado para ${updateData.isActive ? 'ativo' : 'inativo'}`);
      }

      const changeDescription = changes.length > 0 ? changes.join(', ') : 'dados atualizados';
      const targetUserName = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || updatedUser.username;

      await storage.createActivityLog({
        userId: user.id,
        userName: adminName,
        userRole: user.role,
        requestId: null,
        patientName: '',
        action: 'updated',
        actionDescription: `${roleDisplay} ${adminName} editou o usuário "${targetUserName}": ${changeDescription}`,
        requestType: 'user_management',
        requestName: `Usuário ${targetUserName}`,
        oldStatus: null,
        newStatus: null,
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      const currentUserId = (req.session as any).userId;

      // Prevent user from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }

      // Get user data before deletion for activity log
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      await storage.deleteUser(userId);

      // Create activity log for user deletion
      const adminName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const deletedUserName = `${userToDelete.firstName || ''} ${userToDelete.lastName || ''}`.trim() || userToDelete.username;
      
      await storage.createActivityLog({
        userId: user.id,
        userName: adminName,
        userRole: user.role,
        requestId: null,
        patientName: '',
        action: 'deleted',
        actionDescription: `Administrador ${adminName} excluiu o usuário "${deletedUserName}" (${userToDelete.role})`,
        requestType: 'user_management',
        requestName: `Usuário ${deletedUserName}`,
        oldStatus: 'ativo',
        newStatus: 'excluído',
      });

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Erro ao excluir usuário" });
      }
    }
  });

  // Delete user (admin and secretary) - legacy endpoint
  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = parseInt(req.params.id);
      const currentUserId = (req.session as any).userId;

      // Prevent user from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }

      await storage.deleteUser(userId);
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Erro ao excluir usuário" });
      }
    }
  });

  // Health Units
  app.get('/api/health-units', isAuthenticated, async (req, res) => {
    try {
      const healthUnits = await storage.getHealthUnits();
      res.json(healthUnits);
    } catch (error) {
      console.error("Error fetching health units:", error);
      res.status(500).json({ message: "Failed to fetch health units" });
    }
  });

  app.post('/api/health-units', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (user?.role !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertHealthUnitSchema.parse(req.body);
      const healthUnit = await storage.createHealthUnit(validatedData);
      res.json(healthUnit);
    } catch (error) {
      console.error("Error creating health unit:", error);
      res.status(500).json({ message: "Failed to create health unit" });
    }
  });

  app.put('/api/health-units/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertHealthUnitSchema.partial().parse(req.body);
      const healthUnit = await storage.updateHealthUnit(id, validatedData);
      res.json(healthUnit);
    } catch (error) {
      console.error("Error updating health unit:", error);
      res.status(500).json({ message: "Erro ao atualizar unidade" });
    }
  });

  app.delete('/api/health-units/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteHealthUnit(id);
      res.json({ message: "Unidade excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting health unit:", error);
      res.status(500).json({ message: "Erro ao excluir unidade" });
    }
  });

  // Exam Types
  app.get('/api/exam-types', isAuthenticated, async (req, res) => {
    try {
      const examTypes = await storage.getExamTypes();
      res.json(examTypes);
    } catch (error) {
      console.error("Error fetching exam types:", error);
      res.status(500).json({ message: "Failed to fetch exam types" });
    }
  });

  app.post('/api/exam-types', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (user?.role !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertExamTypeSchema.parse(req.body);
      const examType = await storage.createExamType(validatedData);
      res.json(examType);
    } catch (error) {
      console.error("Error creating exam type:", error);
      res.status(500).json({ message: "Failed to create exam type" });
    }
  });

  app.put('/api/exam-types/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('PUT /api/exam-types/:id - Request body:', req.body);
      const id = parseInt(req.params.id);
      console.log('Updating exam type ID:', id);
      
      const validatedData = insertExamTypeSchema.partial().parse(req.body);
      console.log('Validated data:', validatedData);
      
      const examType = await storage.updateExamType(id, validatedData);
      console.log('Updated exam type:', examType);
      
      res.json(examType);
    } catch (error) {
      console.error("Error updating exam type:", error);
      res.status(500).json({ message: "Erro ao atualizar tipo de exame" });
    }
  });

  app.delete('/api/exam-types/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExamType(id);
      res.json({ message: "Tipo de exame excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting exam type:", error);
      res.status(500).json({ message: "Erro ao excluir tipo de exame" });
    }
  });

  // Consultation Types
  app.get('/api/consultation-types', isAuthenticated, async (req, res) => {
    try {
      const consultationTypes = await storage.getConsultationTypes();
      res.json(consultationTypes);
    } catch (error) {
      console.error("Error fetching consultation types:", error);
      res.status(500).json({ message: "Failed to fetch consultation types" });
    }
  });

  app.post('/api/consultation-types', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (user?.role !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertConsultationTypeSchema.parse(req.body);
      const consultationType = await storage.createConsultationType(validatedData);
      res.json(consultationType);
    } catch (error) {
      console.error("Error creating consultation type:", error);
      res.status(500).json({ message: "Failed to create consultation type" });
    }
  });

  app.put('/api/consultation-types/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('PUT /api/consultation-types/:id - Request body:', req.body);
      const id = parseInt(req.params.id);
      console.log('Updating consultation type ID:', id);
      
      const validatedData = insertConsultationTypeSchema.partial().parse(req.body);
      console.log('Validated data:', validatedData);
      
      const consultationType = await storage.updateConsultationType(id, validatedData);
      console.log('Updated consultation type:', consultationType);
      
      res.json(consultationType);
    } catch (error) {
      console.error("Error updating consultation type:", error);
      res.status(500).json({ message: "Erro ao atualizar tipo de consulta" });
    }
  });

  app.delete('/api/consultation-types/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConsultationType(id);
      res.json({ message: "Tipo de consulta excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting consultation type:", error);
      res.status(500).json({ message: "Erro ao excluir tipo de consulta" });
    }
  });

  // Patients
  app.get('/api/patients/search', isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const patients = await storage.searchPatients(q);
      res.json(patients);
    } catch (error) {
      console.error("Error searching patients:", error);
      res.status(500).json({ message: "Failed to search patients" });
    }
  });

  // View patient front ID photo
  app.get('/api/patients/:id/front-id-photo', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'recepcao' && user.role !== 'regulacao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const patient = await storage.getPatient(parseInt(id));

      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      if (!patient.idPhotoFront) {
        return res.status(404).json({ message: "Foto da frente do documento não encontrada" });
      }

      const filePath = path.join(process.cwd(), 'uploads', patient.idPhotoFront);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo de foto não encontrado no servidor" });
      }

      const extension = path.extname(patient.idPhotoFront).toLowerCase();
      const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="rg-frente-${patient.id}${extension}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error viewing front ID photo:", error);
      res.status(500).json({ message: "Erro ao visualizar foto da frente do documento" });
    }
  });

  // View patient back ID photo
  app.get('/api/patients/:id/back-id-photo', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'recepcao' && user.role !== 'regulacao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const patient = await storage.getPatient(parseInt(id));

      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      if (!patient.idPhotoBack) {
        return res.status(404).json({ message: "Foto do verso do documento não encontrada" });
      }

      const filePath = path.join(process.cwd(), 'uploads', patient.idPhotoBack);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo de foto não encontrado no servidor" });
      }

      const extension = path.extname(patient.idPhotoBack).toLowerCase();
      const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="rg-verso-${patient.id}${extension}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error viewing back ID photo:", error);
      res.status(500).json({ message: "Erro ao visualizar foto do verso do documento" });
    }
  });

  // Requests
  app.get('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { status, isUrgent, year, month } = req.query;
      const filters: any = {};

      if (status) filters.status = status;
      if (isUrgent !== undefined) filters.isUrgent = isUrgent === 'true';
      if (year) filters.year = parseInt(year);
      if (month) filters.month = parseInt(month);

      // Filter by role
      if (user.role === 'recepcao') {
        filters.doctorId = user.id.toString(); // Filter by current user for reception role
      } else if (user.role === 'regulacao') {
        // Registrars can see all requests
      } else if (user.role === 'admin') {
        // Admins can see all requests
      }

      const requests = await storage.getRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Get user's recent requests (last 5)
  app.get('/api/requests/user-recent/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser((req.session as any).userId);
      
      if (!user || (user.id !== userId && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      // For reception role users, get requests they created
      // The 'doctorId' field in the request table stores the ID of the reception user who created the request
      const requests = await storage.getRequests({ doctorId: userId.toString() });
      
      console.log(`📋 Buscando requisições para usuário ${userId}, encontradas: ${requests.length} requisições`);
      
      // Get last 5 requests sorted by creation date (most recent first)
      const recentRequests = requests
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);
        
      console.log(`📋 Retornando ${recentRequests.length} requisições recentes`);

      res.json(recentRequests);
    } catch (error) {
      console.error("Error fetching user recent requests:", error);
      res.status(500).json({ message: "Failed to fetch recent requests" });
    }
  });

  app.post('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      console.log('POST /api/requests - Session userId:', (req.session as any).userId);
      const user = await storage.getUser((req.session as any).userId);
      console.log('POST /api/requests - User found:', user?.username, user?.role);
      
      if (!user || (user.role !== 'recepcao' && user.role !== 'admin')) {
        console.log('POST /api/requests - Access denied for user:', user?.username, user?.role);
        return res.status(403).json({ message: "Access denied" });
      }

      const requestData = req.body;
      console.log('POST /api/requests - Request data:', JSON.stringify(requestData, null, 2));

      let patient;

      // Check if this is from mobile panel (has patientId) or regular form (has patientCpf)
      if (requestData.patientId) {
        // Mobile panel format - get existing patient
        patient = await storage.getPatient(requestData.patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Validate exam/consultation selection
        if ((!requestData.examTypeIds || requestData.examTypeIds.length === 0) && 
            (!requestData.consultationTypeIds || requestData.consultationTypeIds.length === 0)) {
          return res.status(400).json({ message: "Selecione pelo menos um exame ou consulta" });
        }
      } else {
        // Regular form format - validate and create/get patient
        if (!requestData.patientCpf || requestData.patientCpf.trim() === '') {
          return res.status(400).json({ message: "CPF é obrigatório para cadastrar o paciente" });
        }

        if (!requestData.patientName || requestData.patientName.trim() === '') {
          return res.status(400).json({ message: "Nome do paciente é obrigatório" });
        }

        if (!requestData.patientAge || isNaN(parseInt(requestData.patientAge))) {
          return res.status(400).json({ message: "Idade válida é obrigatória" });
        }

        if (!requestData.patientPhone || requestData.patientPhone.trim() === '') {
          return res.status(400).json({ message: "Telefone do paciente é obrigatório" });
        }

        if ((!requestData.selectedExams || requestData.selectedExams.length === 0) && 
            (!requestData.selectedConsultations || requestData.selectedConsultations.length === 0)) {
          return res.status(400).json({ message: "Selecione pelo menos um exame ou consulta" });
        }

        // Create or get patient with all available data
        const patientData = {
          name: requestData.patientName.trim(),
          socialName: requestData.patientSocialName?.trim() || null,
          age: parseInt(requestData.patientAge),
          phone: requestData.patientPhone.trim(),
          cpf: requestData.patientCpf.trim(),
          address: requestData.patientAddress?.trim() || null,
          city: requestData.patientCity?.trim() || null,
          state: requestData.patientState?.trim() || null,
          birthDate: requestData.patientBirthDate ? new Date(requestData.patientBirthDate) : null,
          notes: requestData.patientNotes?.trim() || null,
        };

        // Validate the patient data with schema
        const validatedPatientData = insertPatientSchema.parse(patientData);
        patient = await storage.getOrCreatePatient(validatedPatientData);
      }

      const createdRequests = [];

      // Determine doctor and health unit IDs based on request format
      const doctorId = requestData.patientId ? 
        (requestData.doctorId || user.id) : // Mobile panel format or fallback to user
        user.id; // Regular form format
      
      const healthUnitId = requestData.patientId ? 
        (requestData.healthUnitId || user.healthUnitId || 6) : // Mobile panel format or fallback
        user.healthUnitId!; // Regular form format

      // Handle mobile panel format (examTypeIds/consultationTypeIds)
      if (requestData.examTypeIds && requestData.examTypeIds.length > 0) {
        for (const examId of requestData.examTypeIds) {
          // Check if exam requires secretary approval
          const examType = await storage.getExamTypes().then(types => 
            types.find(t => t.id === parseInt(examId))
          );

          const status = examType?.needsSecretaryApproval ? 'Aguardando Análise' : 'received';
          console.log(`Criando requisição de exame: ${examType?.name}, needsSecretaryApproval: ${examType?.needsSecretaryApproval}, status: ${status}`);

          const examRequestData = {
            patientId: patient.id,
            doctorId: doctorId,
            healthUnitId: healthUnitId,
            examTypeId: parseInt(examId),
            consultationTypeId: null,
            isUrgent: requestData.isUrgent || false,
            urgencyExplanation: requestData.urgencyExplanation || null,
            notes: requestData.notes || null,
            status: status,
          };
          const validatedRequestData = insertRequestSchema.parse(examRequestData);
          const request = await storage.createRequest(validatedRequestData);
          createdRequests.push(request);

          // Create activity log
          const recepcaoName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
          const roleDisplay = user.role === 'recepcao' ? 'Atendente' : 
                             user.role === 'regulacao' ? 'Regulação' : 
                             user.role === 'admin' ? 'Administrador' : user.role;
          
          await storage.createActivityLog({
            userId: user.id,
            userName: recepcaoName,
            userRole: user.role,
            requestId: request.id,
            patientName: patient.name,
            action: 'created',
            actionDescription: `${roleDisplay} ${recepcaoName} cadastrou nova requisição de exame "${examType?.name}" para o paciente ${patient.name}${request.isUrgent ? ' (URGENTE)' : ''}`,
            requestType: 'exam',
            requestName: examType?.name || 'Exame',
            newStatus: request.status,
          });
        }
      }

      if (requestData.consultationTypeIds && requestData.consultationTypeIds.length > 0) {
        for (const consultationId of requestData.consultationTypeIds) {
          // Check if consultation requires secretary approval
          const consultationType = await storage.getConsultationTypes().then(types => 
            types.find(t => t.id === parseInt(consultationId))
          );

          const status = consultationType?.needsSecretaryApproval ? 'Aguardando Análise' : 'received';
          console.log(`Criando requisição de consulta: ${consultationType?.name}, needsSecretaryApproval: ${consultationType?.needsSecretaryApproval}, status: ${status}`);

          const consultationRequestData = {
            patientId: patient.id,
            doctorId: doctorId,
            healthUnitId: healthUnitId,
            examTypeId: null,
            consultationTypeId: parseInt(consultationId),
            isUrgent: requestData.isUrgent || false,
            urgencyExplanation: requestData.urgencyExplanation || null,
            notes: requestData.notes || null,
            status: status,
          };
          const validatedRequestData = insertRequestSchema.parse(consultationRequestData);
          const request = await storage.createRequest(validatedRequestData);
          createdRequests.push(request);

          // Create activity log
          const recepcaoName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
          const roleDisplay = user.role === 'recepcao' ? 'Atendente' : 
                             user.role === 'regulacao' ? 'Regulação' : 
                             user.role === 'admin' ? 'Administrador' : user.role;
          
          await storage.createActivityLog({
            userId: user.id,
            userName: recepcaoName,
            userRole: user.role,
            requestId: request.id,
            patientName: patient.name,
            action: 'created',
            actionDescription: `${roleDisplay} ${recepcaoName} cadastrou nova requisição de consulta "${consultationType?.name}" para o paciente ${patient.name}${request.isUrgent ? ' (URGENTE)' : ''}`,
            requestType: 'consultation',
            requestName: consultationType?.name || 'Consulta',
            newStatus: request.status,
          });
        }
      }

      // Handle regular form format (selectedExams/selectedConsultations) - keep existing logic
      if (requestData.selectedExams && requestData.selectedExams.length > 0) {
        for (const examId of requestData.selectedExams) {
          // Check if exam requires secretary approval
          const examType = await storage.getExamTypes().then(types => 
            types.find(t => t.id === parseInt(examId))
          );

          const status = examType?.needsSecretaryApproval ? 'Aguardando Análise' : 'received';
          console.log(`Criando requisição de exame: ${examType?.name}, needsSecretaryApproval: ${examType?.needsSecretaryApproval}, status: ${status}`);

          const examRequestData = {
            patientId: patient.id,
            doctorId: user.id,
            healthUnitId: user.healthUnitId!,
            examTypeId: parseInt(examId),
            consultationTypeId: null,
            isUrgent: requestData.isUrgent || false,
            urgencyExplanation: requestData.urgencyExplanation || null,
            status: status,
          };
          const validatedRequestData = insertRequestSchema.parse(examRequestData);
          const request = await storage.createRequest(validatedRequestData);
          createdRequests.push(request);

          // Create activity log
          const recepcaoName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
          const roleDisplay = user.role === 'recepcao' ? 'Atendente' : 
                             user.role === 'regulacao' ? 'Regulação' : 
                             user.role === 'admin' ? 'Administrador' : user.role;
          
          await storage.createActivityLog({
            userId: user.id,
            userName: recepcaoName,
            userRole: user.role,
            requestId: request.id,
            patientName: patient.name,
            action: 'created',
            actionDescription: `${roleDisplay} ${recepcaoName} cadastrou nova requisição de exame "${examType?.name}" para o paciente ${patient.name}${request.isUrgent ? ' (URGENTE)' : ''}`,
            requestType: 'exam',
            requestName: examType?.name || 'Exame',
            newStatus: request.status,
          });
        }
      }

      if (requestData.selectedConsultations && requestData.selectedConsultations.length > 0) {
        for (const consultationId of requestData.selectedConsultations) {
          // Check if consultation requires secretary approval
          const consultationType = await storage.getConsultationTypes().then(types => 
            types.find(t => t.id === parseInt(consultationId))
          );

          const status = consultationType?.needsSecretaryApproval ? 'Aguardando Análise' : 'received';
          console.log(`Criando requisição de consulta: ${consultationType?.name}, needsSecretaryApproval: ${consultationType?.needsSecretaryApproval}, status: ${status}`);

          const consultationRequestData = {
            patientId: patient.id,
            doctorId: user.id,
            healthUnitId: user.healthUnitId!,
            examTypeId: null,
            consultationTypeId: parseInt(consultationId),
            isUrgent: requestData.isUrgent || false,
            urgencyExplanation: requestData.urgencyExplanation || null,
            status: status,
          };
          const validatedRequestData = insertRequestSchema.parse(consultationRequestData);
          const request = await storage.createRequest(validatedRequestData);
          createdRequests.push(request);

          // Create activity log
          const recepcaoName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
          const roleDisplay = user.role === 'recepcao' ? 'Atendente' : 
                             user.role === 'regulacao' ? 'Regulação' : 
                             user.role === 'admin' ? 'Administrador' : user.role;
          
          await storage.createActivityLog({
            userId: user.id,
            userName: recepcaoName,
            userRole: user.role,
            requestId: request.id,
            patientName: patient.name,
            action: 'created',
            actionDescription: `${roleDisplay} ${recepcaoName} cadastrou nova requisição de consulta "${consultationType?.name}" para o paciente ${patient.name}${request.isUrgent ? ' (URGENTE)' : ''}`,
            requestType: 'consultation',
            requestName: consultationType?.name || 'Consulta',
            newStatus: request.status,
          });
        }
      }

      if (createdRequests.length === 0) {
        return res.status(400).json({ message: "Selecione pelo menos um exame ou consulta" });
      }

      res.json({ 
        message: `${createdRequests.length} requisição(ões) criada(s) com sucesso`,
        requests: createdRequests,
        count: createdRequests.length
      });
    } catch (error) {
      console.error("Error creating request:", error);

      // Handle specific validation errors
      if (error instanceof Error) {
        if (error.message.includes('invalid_type') || error.message.includes('validation')) {
          return res.status(400).json({ 
            message: "Dados inválidos fornecidos. Verifique todos os campos obrigatórios.",
            error: error.message 
          });
        }

        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return res.status(400).json({ 
            message: "Erro: dados duplicados detectados.",
            error: error.message 
          });
        }
      }

      res.status(500).json({ 
        message: "Erro interno do servidor ao criar requisição",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  app.get('/api/requests/urgent', isAuthenticated, async (req, res) => {
    try {
      const urgentRequests = await storage.getUrgentRequests();
      res.json(urgentRequests);
    } catch (error) {
      console.error("Error fetching urgent requests:", error);
      res.status(500).json({ message: "Failed to fetch urgent requests" });
    }
  });

  app.delete('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      console.log(`🗑️ DELETE REQUEST - User: ${user?.username} (${user?.role}) trying to delete request ${req.params.id}`);
      
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao' && user.role !== 'recepcao')) {
        console.log(`❌ DELETE REQUEST - Access denied: invalid role ${user?.role}`);
        return res.status(403).json({ message: "Access denied" });
      }

      const id = parseInt(req.params.id);
      
      // Check if request is completed - only regulacao and admin can delete completed requests
      const request = await storage.getRequestById(id);
      console.log(`🔍 DELETE REQUEST - Request found: ${request?.id}, status: ${request?.status}, doctorId: ${request?.doctorId}, userId: ${user.id}`);
      
      if (!request) {
        console.log(`❌ DELETE REQUEST - Request ${id} not found`);
        return res.status(404).json({ message: "Requisição não encontrada" });
      }
      
      if (request.status === 'completed' && user.role !== 'admin' && user.role !== 'regulacao') {
        console.log(`❌ DELETE REQUEST - Cannot delete completed request ${id} - user role: ${user.role}`);
        return res.status(403).json({ message: "Apenas usuários de regulação e administradores podem deletar requisições concluídas" });
      }

      console.log(`✅ DELETE REQUEST - Proceeding to delete request ${id}`);
      await storage.deleteRequest(id);
      
      res.json({ message: "Requisição excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting request:", error);
      res.status(500).json({ message: "Erro ao excluir requisição" });
    }
  });

  // Mark request as suspended with reason
  app.patch('/api/requests/:id/mark-suspended', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || user.role !== 'regulacao') {
        return res.status(403).json({ message: "Apenas usuários de regulação podem marcar requisições como suspenso" });
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: "Motivo da suspensão é obrigatório" });
      }

      // Get current request
      const request = await storage.getRequestById(parseInt(id));
      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Update request status to 'suspenso' and add reason as comment
      await db.update(requests).set({
        status: 'suspenso',
        notes: reason,
        updatedAt: new Date()
      }).where(eq(requests.id, parseInt(id)));

      console.log(`❌ Request ${id} marked as suspended by ${user.username}: ${reason}`);
      
      res.json({ 
        message: "Requisição marcada como suspenso",
        reason: reason
      });
    } catch (error) {
      console.error("Error marking request as suspended:", error);
      res.status(500).json({ message: "Erro ao marcar requisição como suspenso" });
    }
  });

  // Endpoint para reverter requisição suspenso para status recebido
  app.patch('/api/requests/:id/revert-suspended', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || !['recepcao', 'regulacao', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Sem permissão para reverter requisições" });
      }

      const { id } = req.params;

      // Get current request
      const request = await storage.getRequestById(parseInt(id));
      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      if (request.status !== 'suspenso') {
        return res.status(400).json({ message: "Apenas requisições suspensas podem ser revertidas" });
      }

      // Update request status back to 'received' and clear suspension notes
      await db.update(requests).set({
        status: 'received',
        notes: null,
        updatedAt: new Date()
      }).where(eq(requests.id, parseInt(id)));

      console.log(`✅ Request ${id} reverted from suspended status by ${user.username}`);
      
      res.json({ 
        message: "Requisição revertida para status recebido",
        newStatus: "received"
      });
    } catch (error) {
      console.error("Error reverting suspended request:", error);
      res.status(500).json({ message: "Erro ao reverter requisição" });
    }
  });

  // Endpoint para buscar requisições suspensas do usuário logado
  app.get('/api/requests/user-suspended', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(403).json({ message: "Usuário não encontrado" });
      }

      console.log(`🔍 Searching for suspended requests...`);
      
      // Use raw SQL query to ensure we get the suspended requests
      const result = await pool.query(`
        SELECT 
          r.*,
          p.name as patient_name,
          p.cpf as patient_cpf,
          p.age as patient_age,
          et.name as exam_type_name,
          ct.name as consultation_type_name,
          u.first_name || ' ' || u.last_name as doctor_name,
          hu.name as health_unit_name
        FROM requests r
        LEFT JOIN patients p ON r.patient_id = p.id
        LEFT JOIN exam_types et ON r.exam_type_id = et.id
        LEFT JOIN consultation_types ct ON r.consultation_type_id = ct.id
        LEFT JOIN users u ON r.doctor_id = u.id
        LEFT JOIN health_units hu ON r.health_unit_id = hu.id
        WHERE r.status = 'suspenso'
        ORDER BY r.created_at DESC
      `);

      const suspendedRequests = result.rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        patient: {
          id: row.patient_id,
          name: row.patient_name,
          cpf: row.patient_cpf,
          age: row.patient_age
        },
        examType: row.exam_type_name ? { name: row.exam_type_name } : null,
        consultationType: row.consultation_type_name ? { name: row.consultation_type_name } : null,
        doctor: {
          name: row.doctor_name
        },
        healthUnit: {
          name: row.health_unit_name
        }
      }));
      
      console.log(`📋 Found ${suspendedRequests.length} suspended requests using raw SQL`);
      res.json(suspendedRequests);
    } catch (error) {
      console.error("Error fetching user suspended requests:", error);
      res.status(500).json({ message: "Erro ao buscar requisições suspensas" });
    }
  });

  // Fix failed request back to received status
  app.patch('/api/requests/:id/fix-failed', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'recepcao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Apenas usuários de recepção e administradores podem corrigir requisições suspensas" });
      }

      const { id } = req.params;

      // Get current request
      const request = await storage.getRequestById(parseInt(id));
      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      if (request.status !== 'suspenso') {
        return res.status(400).json({ message: "Requisição não está marcada como suspensa" });
      }

      // Update request status back to 'received'
      await db.update(requests).set({
        status: 'received',
        updatedAt: new Date()
      }).where(eq(requests.id, parseInt(id)));

      console.log(`✅ Request ${id} fixed back to received by ${user.username}`);
      
      res.json({ 
        message: "Requisição corrigida e retornada para status recebido"
      });
    } catch (error) {
      console.error("Error fixing failed request:", error);
      res.status(500).json({ message: "Erro ao corrigir requisição" });
    }
  });

  // Batch forward multiple requests to another month
  app.patch('/api/requests/batch-forward', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Apenas administradores podem encaminhar requisições" });
      }

      const { requestIds, month, year, reason } = req.body;

      // Validate input
      if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ message: "Lista de IDs de requisições é obrigatória" });
      }

      if (!month || !year || month < 1 || month > 12 || year < 2024 || year > 2030) {
        return res.status(400).json({ message: "Mês e ano inválidos" });
      }

      let forwardedCount = 0;
      let failedCount = 0;
      const failedIds: number[] = [];

      // Process each request
      for (const requestId of requestIds) {
        try {
          // Parse ID safely
          const id = parseInt(requestId);
          if (isNaN(id)) {
            console.error(`Invalid ID: ${requestId} (NaN)`);
            failedCount++;
            failedIds.push(requestId);
            continue;
          }

          // Get current request
          const currentRequest = await storage.getRequestById(id);
          if (!currentRequest) {
            console.error(`Request not found: ${id}`);
            failedCount++;
            failedIds.push(id);
            continue;
          }

          // Create new creation date for the forwarded month
          const newCreationDate = new Date(year, month - 1, 1);

          // Update request with forwarding information
          const updateData: any = {
            createdAt: newCreationDate,
            updatedAt: new Date()
          };
          
          // Change status to 'received' when forwarding
          updateData.status = 'received';

          await db.update(requests).set(updateData).where(eq(requests.id, id));

          console.log(`📅 Request ${id} forwarded to ${month}/${year} by ${user.username}`);
          forwardedCount++;
        } catch (error) {
          console.error(`Error forwarding request ${requestId}:`, error);
          failedCount++;
          failedIds.push(requestId);
        }
      }

      res.json({ 
        message: `Encaminhamento em lote concluído: ${forwardedCount} sucessos, ${failedCount} falhas`,
        forwardedCount,
        failedCount,
        failedIds,
        forwardedTo: { month, year },
        forwardedBy: user.username,
        forwardedAt: new Date()
      });
    } catch (error) {
      console.error("Error in batch forward:", error);
      res.status(500).json({ message: "Erro ao encaminhar requisições em lote" });
    }
  });

  // Forward request to another month
  app.patch('/api/requests/:id/forward', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Apenas administradores podem encaminhar requisições" });
      }

      const { id } = req.params;
      const { month, year, reason } = req.body;

      // Validate month and year
      if (!month || !year || month < 1 || month > 12 || year < 2024 || year > 2030) {
        return res.status(400).json({ message: "Mês e ano inválidos" });
      }

      // Get current request
      const currentRequest = await storage.getRequestById(parseInt(id));
      if (!currentRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Update request with forwarding information
      // Only change status to "Aguardando Análise" if it's not already approved
      // Change creation date to first day of the forwarded month
      const newCreationDate = new Date(year, month - 1, 1); // month - 1 because JS months are 0-indexed
      
      const updateData: any = {
        forwardedToMonth: month,
        forwardedToYear: year,
        forwardedBy: user.id,
        forwardedAt: new Date(),
        forwardedReason: reason || null,
        createdAt: newCreationDate, // Change creation date to first day of forwarded month
        updatedAt: new Date()
      };
      
      // Change status to 'received' when forwarding
      updateData.status = 'received';

      await db.update(requests).set(updateData).where(eq(requests.id, parseInt(id)));

      console.log(`📅 Request ${id} forwarded to ${month}/${year} by ${user.username}`);
      console.log(`📅 Request ${id} creation date changed from ${currentRequest.createdAt?.toISOString()} to ${newCreationDate.toISOString()}`);
      
      res.json({ 
        message: `Requisição encaminhada para ${month}/${year} com sucesso`,
        forwardedTo: { month, year },
        forwardedBy: user.username,
        forwardedAt: new Date()
      });
    } catch (error) {
      console.error("Error forwarding request:", error);
      res.status(500).json({ message: "Erro ao encaminhar requisição" });
    }
  });

  // Update request notes/comments
  app.patch('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin' && user.role !== 'recepcao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { notes } = req.body;

      // Validate ID parameter
      const requestId = parseInt(id);
      if (isNaN(requestId)) {
        console.error(`Invalid request ID for notes update: ${id} (NaN)`);
        return res.status(400).json({ message: "ID da requisição inválido" });
      }

      // Get current request
      const currentRequest = await storage.getRequestById(requestId);
      if (!currentRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Update request notes using direct database update
      const updateData: any = {};
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }
      
      await db.update(requests).set(updateData).where(eq(requests.id, requestId));

      // Get updated request
      const updatedRequest = await storage.getRequestById(requestId);
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating request notes:", error);
      res.status(500).json({ message: "Failed to update request notes" });
    }
  });

  app.patch('/api/requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      console.log("User attempting to update status:", user?.username, "role:", user?.role);

      if (!user || (user.role !== 'regulacao' && user.role !== 'admin')) {
        console.log("Access denied for user:", user?.username, "with role:", user?.role);
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Get current request to track old status
      const currentRequest = await storage.getRequestById(parseInt(id));
      if (!currentRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      const request = await storage.updateRequestStatus(
        parseInt(id),
        status,
        user.role === 'regulacao' ? user.id : undefined
      );

      // Create activity log for statuschange
      const requestType = currentRequest.examType ? 'exam' : 'consultation';
      const requestName = currentRequest.examType?.name || currentRequest.consultationType?.name || 'N/A';
      const userDisplayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const userRoleDisplay = user.role === 'recepcao' ? 'Atendente' : 
                             user.role === 'regulacao' ? 'Regulação' : 
                             user.role === 'admin' ? 'Administrador' : user.role;

      let actionDescription = '';
      const typeText = requestType === 'exam' ? 'exame' : 'consulta';
      const statusTranslation: { [key: string]: string } = {
        'received': 'Recebido',
        'accepted': 'Aceito',
        'confirmed': 'Confirmado',
        'completed': 'Finalizado',
        'cancelled': 'Cancelado',
        'Aguardando Análise': 'Aguardando Análise'
      };
      
      if (status === 'completed') {
        actionDescription = `${userRoleDisplay} ${userDisplayName} finalizou o ${typeText} "${requestName}" do paciente ${currentRequest.patient.name}`;
      } else if (status === 'confirmed') {
        actionDescription = `${userRoleDisplay} ${userDisplayName} confirmou o ${typeText} "${requestName}" do paciente ${currentRequest.patient.name}`;
      } else if (status === 'accepted') {
        actionDescription = `${userRoleDisplay} ${userDisplayName} aceitou o ${typeText} "${requestName}" do paciente ${currentRequest.patient.name}`;
      } else if (status === 'cancelled') {
        actionDescription = `${userRoleDisplay} ${userDisplayName} cancelou o ${typeText} "${requestName}" do paciente ${currentRequest.patient.name}`;
      } else {
        const oldStatusText = statusTranslation[currentRequest.status] || currentRequest.status;
        const newStatusText = statusTranslation[status] || status;
        actionDescription = `${userRoleDisplay} ${userDisplayName} alterou o status do ${typeText} "${requestName}" do paciente ${currentRequest.patient.name} de "${oldStatusText}" para "${newStatusText}"`;
      }

      await storage.createActivityLog({
        userId: user.id,
        userName: userDisplayName,
        userRole: user.role,
        requestId: request.id,
        patientName: currentRequest.patient.name,
        action: 'status_changed',
        actionDescription,
        requestType,
        requestName,
        oldStatus: currentRequest.status,
        newStatus: status,
      });

      res.json(request);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ message: "Failed to update request status" });
    }
  });

  // Complete request with exam/consultation details and mandatory result file upload
  app.post('/api/requests/:id/complete', isAuthenticated, upload.single('resultFile'), async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { examLocation, examDate, examTime } = req.body;
      const file = req.file;

      if (!examLocation || !examDate || !examTime) {
        return res.status(400).json({ message: "Local, data e horário são obrigatórios" });
      }

      if (!file) {
        return res.status(400).json({ message: "Upload da cópia do resultado do exame é obrigatório" });
      }

      // Get current request
      const currentRequest = await storage.getRequestById(parseInt(id));
      if (!currentRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Complete request with all data including the result file
      const completionData = {
        examLocation,
        examDate,
        examTime,
        resultFileName: file.filename,
        resultFileSize: file.size,
        resultMimeType: file.mimetype,
        resultUploadedAt: new Date(),
        resultUploadedBy: user.id,
      };

      const request = await storage.completeRequestWithResult(parseInt(id), completionData);

      // Create activity log for completion
      const requestType = currentRequest.examType ? 'exame' : 'consulta';
      const requestName = currentRequest.examType?.name || currentRequest.consultationType?.name || 'N/A';
      const userDisplayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const userRoleDisplay = user.role === 'regulacao' ? 'Regulação' : 'Administrador';
      
      // Format date and time properly - fix timezone issue
      // Parse the date string correctly to avoid timezone conversion
      const dateParts = examDate.split('-');
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      const [hours, minutes] = examTime.split(':');
      const formattedTime = `${hours}:${minutes}`;

      const actionDescription = `${userRoleDisplay} ${userDisplayName} concluiu o ${requestType} "${requestName}" do paciente ${currentRequest.patient.name} - Agendado para ${formattedDate} às ${formattedTime} em ${examLocation}`;

      await storage.createActivityLog({
        userId: user.id,
        userName: userDisplayName,
        userRole: user.role,
        requestId: request.id,
        patientName: currentRequest.patient.name,
        action: 'completed',
        actionDescription,
        requestType,
        requestName,
        oldStatus: currentRequest.status,
        newStatus: 'completed',
      });

      // Generate WhatsApp message with link to result file
      const phone = currentRequest.patient.phone;
      const patientName = currentRequest.patient.name;
      const resultFileUrl = `${req.protocol}://${req.get('host')}/api/requests/${id}/view-result`;
      
      const message = `🏥 *Prefeitura Municipal de Alexandria/RN*
*Setor de Regulação*

Olá, ${patientName}!

Informamos que sua ${requestType} foi agendada:

📅 *Data:* ${formattedDate}
🕐 *Horário:* ${formattedTime}
📍 *Local:* ${examLocation}

📄 *Resultado da solicitação disponível em:*

${resultFileUrl}

*📋 Documentos necessários no dia do exame:*
• Xerox de Identidade (RG ou CNH)
• Cópia da requisição
• Cópia do cartão SUS
• Requisição do médico
• Comprovante de residência
• Comprovante de residência

*Importante:*
• Chegue com 30 minutos de antecedência
• Traga documento com foto original
• Em caso de impedimento, comunique com antecedência

Atenciosamente,
${userDisplayName}
Setor de Regulação`;
      
      // Clean phone number for WhatsApp (remove formatting)
      const cleanPhone = phone?.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

      res.json({ 
        request,
        whatsappUrl,
        message,
        examDetails: {
          location: examLocation,
          date: formattedDate,
          time: formattedTime
        },
        resultFile: {
          fileName: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: resultFileUrl
        }
      });
    } catch (error) {
      console.error("Error completing request:", error);
      res.status(500).json({ message: "Failed to complete request" });
    }
  });

  // View result file
  app.get('/api/requests/:id/view-result', async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getRequestById(parseInt(id));

      console.log(`Tentando visualizar resultado para requisição ${id}`);

      if (!request) {
        console.log(`Requisição ${id} não encontrada no banco de dados`);
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      if (!request.resultFileName) {
        console.log(`Requisição ${id} não possui arquivo de resultado`);
        return res.status(404).json({ message: "Esta requisição não possui arquivo de resultado" });
      }

      const filePath = path.join(process.cwd(), 'uploads', request.resultFileName);
      console.log(`Buscando arquivo em: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.log(`Arquivo físico não encontrado: ${request.resultFileName}`);
        console.log(`Status da requisição: ${request.status}`);
        
        // Check if there are similar files that might be the correct one
        const uploadDir = path.join(process.cwd(), 'uploads');
        const allFiles = fs.readdirSync(uploadDir);
        const similarFiles = allFiles.filter(file => 
          file.includes(request.id.toString()) || 
          file.includes('result') ||
          file.includes('request')
        );
        
        console.log(`Arquivos similares encontrados:`, similarFiles);
        
        return res.status(404).json({ 
          message: "Arquivo de resultado não encontrado no servidor. O arquivo pode ter sido movido ou removido.",
          details: {
            expectedFile: request.resultFileName,
            requestId: request.id,
            uploadedAt: request.resultUploadedAt
          }
        });
      }

      // Set content type based on file mime type from database
      const mimeType = request.resultMimeType || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      
      // Add headers to ensure proper display in browser
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Set appropriate file extension based on mime type
      let extension = '.pdf';
      if (mimeType.includes('image/png')) extension = '.png';
      else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) extension = '.jpg';
      
      // Check if download is requested
      const forceDownload = req.query.download === '1';
      const disposition = forceDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="resultado-exame-${request.id}${extension}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error viewing result file:", error);
      res.status(500).json({ message: "Erro ao visualizar arquivo de resultado" });
    }
  });

  // Download result file
  app.get('/api/requests/:id/download-result', async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getRequestById(parseInt(id));

      console.log(`Tentando download de resultado para requisição ${id}`);

      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      if (!request.resultFileName) {
        return res.status(404).json({ message: "Esta requisição não possui arquivo de resultado" });
      }

      const filePath = path.join(process.cwd(), 'uploads', request.resultFileName);
      console.log(`Arquivo solicitado: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.log(`Arquivo físico não encontrado para download: ${request.resultFileName}`);
        
        // Try to find similar files that might be the correct one
        const uploadDir = path.join(process.cwd(), 'uploads');
        const allFiles = fs.readdirSync(uploadDir);
        const possibleFiles = allFiles.filter(file => 
          file.includes(request.id.toString()) ||
          file.toLowerCase().includes('result') ||
          (file.includes('request') && file.includes('.pdf'))
        );
        
        if (possibleFiles.length > 0) {
          console.log(`Arquivos alternativos encontrados:`, possibleFiles);
          // Try the first match
          const alternativeFile = path.join(uploadDir, possibleFiles[0]);
          if (fs.existsSync(alternativeFile)) {
            console.log(`Usando arquivo alternativo: ${possibleFiles[0]}`);
            return res.download(alternativeFile, `resultado-exame-${request.id}.pdf`);
          }
        }
        
        return res.status(404).json({ 
          message: "Arquivo de resultado não encontrado no servidor",
          details: {
            expectedFile: request.resultFileName,
            possibleAlternatives: possibleFiles
          }
        });
      }

      res.download(filePath, `resultado-exame-${request.id}.pdf`);
    } catch (error) {
      console.error("Error downloading result file:", error);
      res.status(500).json({ message: "Erro ao baixar arquivo de resultado" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const yearParam = req.query.year as string;
      const monthParam = req.query.month as string;
      
      console.log(`📊 DASHBOARD STATS - Raw params - Year: ${yearParam}, Month: ${monthParam}`);
      
      // Validate parameters
      let year: number | undefined;
      let month: number | undefined;
      
      if (yearParam) {
        year = parseInt(yearParam);
        if (isNaN(year) || year < 2020 || year > 2030) {
          return res.status(400).json({ message: "Invalid year parameter" });
        }
      }
      
      if (monthParam) {
        month = parseInt(monthParam);
        if (isNaN(month) || month < 1 || month > 12) {
          return res.status(400).json({ message: "Invalid month parameter" });
        }
      }
      
      console.log(`📊 DASHBOARD STATS - Validated params - Year: ${year}, Month: ${month}`);
      
      const stats = await storage.getRequestStats(year, month);
      console.log(`📊 DASHBOARD STATS - Result:`, stats);
      
      // Ensure we return valid JSON
      res.setHeader('Content-Type', 'application/json');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/quota-usage', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      console.log(`=== DASHBOARD QUOTA USAGE DEBUG ===`);
      console.log('Query params - Year:', year, 'Month:', month);
      
      const quotaUsage = await storage.getMonthlyQuotaUsage(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined
      );
      
      console.log('Quota usage result count:', quotaUsage.length);
      console.log('First few items:', quotaUsage.slice(0, 3));
      console.log(`=== END DASHBOARD QUOTA USAGE DEBUG ===`);
      
      res.json(quotaUsage);
    } catch (error) {
      console.error("Error fetching quota usage:", error);
      res.status(500).json({ message: "Failed to fetch quota usage" });
    }
  });

  app.get('/api/dashboard/spending', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      console.log(`=== DASHBOARD SPENDING DEBUG ===`);
      console.log('Query params - Year:', year, 'Month:', month);
      console.log('Calling getMonthlySpending with confirmed status filter');
      
      // Get received spending (only received status)
      const receivedSpending = await storage.getMonthlySpending(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined,
        ['received'] // Only received status
      );
      
      console.log('Received spending result:', receivedSpending.length, 'items');
      
      // Get confirmed spending (accepted, confirmed, completed requests)
      const confirmedSpending = await storage.getMonthlySpending(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined,
        ['accepted', 'confirmed', 'completed'] // Exclude received status
      );
      
      console.log('Confirmed spending result:', confirmedSpending.length, 'items');
      
      // Get forecast spending (pending approval requests)
      const forecastSpending = await storage.getMonthlySpending(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined,
        ['Aguardando Análise'] // Pending status
      );
      
      console.log('Forecast spending result:', forecastSpending.length, 'items');
      console.log(`=== END DASHBOARD SPENDING DEBUG ===`);
      
      res.json({
        received: receivedSpending,
        confirmed: confirmedSpending,
        forecast: forecastSpending
      });
    } catch (error) {
      console.error("Error fetching spending data:", error);
      res.status(500).json({ message: "Failed to fetch spending data" });
    }
  });

  app.get('/api/dashboard/available-months', isAuthenticated, async (req, res) => {
    try {
      const availableMonths = await storage.getAvailableMonths();
      res.json(availableMonths);
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ message: "Failed to fetch available months" });
    }
  });

  // File upload routes
  // Public route for document upload (for status query page)
  app.post('/api/requests/:id/upload-attachment-public', (req: any, res, next) => {
    upload.single('attachment')(req, res, (err) => {
      if (err) {
        console.error('Erro no upload público:', err);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "Arquivo muito grande. Tamanho máximo: 10MB" });
        }
        
        if (err.message.includes('Apenas arquivos PDF, JPG e PNG são permitidos')) {
          return res.status(400).json({ message: "Apenas arquivos PDF, JPG e PNG são permitidos" });
        }
        
        return res.status(400).json({ message: "Erro no upload do arquivo: " + err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Verify that the request exists
      const request = await storage.getRequestById(parseInt(id));
      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Update request with attachment info
      const attachmentData = {
        attachmentFileName: file.filename,
        attachmentFileSize: file.size,
        attachmentMimeType: file.mimetype,
        attachmentUploadedAt: new Date(),
        attachmentUploadedBy: null, // Public upload, no user ID
      };

      const updatedRequest = await storage.updateRequestAttachment(parseInt(id), attachmentData);

      res.json({ 
        message: "Anexo carregado com sucesso",
        attachment: {
          fileName: file.filename,
          originalName: file.originalname,
          size: file.size,
          uploadedAt: attachmentData.attachmentUploadedAt,
        }
      });
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ message: "Erro ao carregar anexo" });
    }
  });

  // Public route for additional document upload
  app.post('/api/requests/:id/upload-additional-document', (req: any, res, next) => {
    uploadAdditionalDoc.single('additionalDocument')(req, res, (err) => {
      if (err) {
        console.error('Erro no upload adicional:', err);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "Arquivo muito grande. Tamanho máximo: 15MB" });
        }
        
        if (err.message.includes('Tipo de arquivo não permitido')) {
          return res.status(400).json({ message: err.message });
        }
        
        return res.status(400).json({ message: "Erro no upload do arquivo: " + err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Verify that the request exists
      const request = await storage.getRequestById(parseInt(id));
      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Update request with additional document info
      const additionalDocData = {
        additionalDocumentFileName: file.filename,
        additionalDocumentFileSize: file.size,
        additionalDocumentMimeType: file.mimetype,
        additionalDocumentUploadedAt: new Date(),
        additionalDocumentUploadedBy: null, // Public upload, no user ID
      };

      const updatedRequest = await storage.updateRequestAdditionalDocument(parseInt(id), additionalDocData);

      res.json({ 
        message: "Documento adicional carregado com sucesso",
        additionalDocument: {
          fileName: file.filename,
          originalName: file.originalname,
          size: file.size,
          uploadedAt: additionalDocData.additionalDocumentUploadedAt,
        }
      });
    } catch (error) {
      console.error("Error uploading additional document:", error);
      res.status(500).json({ message: "Erro ao carregar documento adicional" });
    }
  });

  app.post('/api/requests/:id/upload-attachment', isAuthenticated, upload.single('attachment'), async (req: any, res) => {
    try {
      console.log(`📤 UPLOAD ATTACHMENT - Início do processo para requisição ${req.params.id}`);
      
      const user = await storage.getUser((req.session as any).userId);
      console.log(`👤 Usuário autenticado: ${user?.username} (${user?.role})`);
      
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin' && user.role !== 'recepcao')) {
        console.log(`❌ Acesso negado - Usuário: ${user?.username}, Role: ${user?.role}`);
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const file = req.file;

      console.log(`📁 Arquivo recebido:`, {
        id: id,
        fileName: file?.filename,
        originalName: file?.originalname,
        size: file?.size,
        mimetype: file?.mimetype
      });

      if (!id || id === 'undefined' || isNaN(parseInt(id))) {
        console.log(`❌ ID de requisição inválido: ${id}`);
        return res.status(400).json({ message: "ID de requisição inválido" });
      }

      if (!file) {
        console.log(`❌ Nenhum arquivo foi enviado`);
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Update request with attachment info
      const attachmentData = {
        attachmentFileName: file.filename,
        attachmentFileSize: file.size,
        attachmentMimeType: file.mimetype,
        attachmentUploadedAt: new Date(),
        attachmentUploadedBy: user.id,
      };

      console.log(`💾 Salvando dados do anexo no banco:`, attachmentData);

      const updatedRequest = await storage.updateRequestAttachment(parseInt(id), attachmentData);

      console.log(`✅ Anexo salvo com sucesso para requisição ${id}`);

      res.json({ 
        message: "Anexo carregado com sucesso",
        attachment: {
          fileName: file.filename,
          originalName: file.originalname,
          size: file.size,
          uploadedAt: attachmentData.attachmentUploadedAt,
          uploadedBy: user.username
        }
      });
    } catch (error) {
      console.error("❌ Erro detalhado no upload de anexo:", error);
      res.status(500).json({ message: "Erro ao carregar anexo" });
    }
  });

  app.get('/api/requests/:id/download-attachment', async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getRequestById(parseInt(id));

      if (!request || !request.attachmentFileName) {
        return res.status(404).json({ message: "Anexo não encontrado" });
      }

      const filePath = path.join(process.cwd(), 'uploads', request.attachmentFileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      res.download(filePath, `exame-${request.id}.pdf`);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ message: "Erro ao baixar anexo" });
    }
  });

  app.get('/api/requests/:id/view-attachment', async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getRequestById(parseInt(id));

      console.log(`🔍 VIEW ATTACHMENT - Req ${id} - ${request?.attachmentFileName || 'sem anexo'}`);

      if (!request || !request.attachmentFileName) {
        console.log(`❌ Requisição ${id} não possui anexo`);
        return res.status(404).json({ message: "Anexo não encontrado" });
      }

      const filePath = path.join(process.cwd(), 'uploads', request.attachmentFileName);
      console.log(`📁 Buscando arquivo: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.log(`❌ Arquivo principal não encontrado: ${request.attachmentFileName}`);
        
        // Try to find alternative files that might be the correct attachment
        const uploadDir = path.join(process.cwd(), 'uploads');
        const allFiles = fs.readdirSync(uploadDir);
        
        // Look for files that might be related to this request
        const possibleFiles = allFiles.filter(file => {
          const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file);
          const containsRequestId = file.includes(`request-`) && file.includes(request.id.toString());
          const recentFiles = file.includes('test') || file.includes('image_') || file.includes('mayara');
          
          return isImage && (containsRequestId || recentFiles);
        });
        
        console.log(`🔍 Arquivos alternativos encontrados:`, possibleFiles);
        
        if (possibleFiles.length > 0) {
          // Use the most recent file or one that matches the request pattern
          const bestMatch = possibleFiles.find(file => file.includes(`request-`)) || possibleFiles[possibleFiles.length - 1];
          const alternativeFilePath = path.join(uploadDir, bestMatch);
          
          if (fs.existsSync(alternativeFilePath)) {
            console.log(`✅ Usando arquivo alternativo: ${bestMatch}`);
            
            // Set content type based on file extension
            let mimeType = 'image/png';
            if (bestMatch.toLowerCase().includes('.jpg') || bestMatch.toLowerCase().includes('.jpeg')) {
              mimeType = 'image/jpeg';
            }
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            
            const forceDownload = req.query.download === '1';
            const disposition = forceDownload ? 'attachment' : 'inline';
            const extension = mimeType.includes('jpeg') ? '.jpg' : '.png';
            res.setHeader('Content-Disposition', `${disposition}; filename="exame-${request.id}${extension}"`);
            
            return res.sendFile(alternativeFilePath);
          }
        }
        
        console.log(`❌ Nenhum arquivo alternativo encontrado para requisição ${id}`);
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      // File exists, serve it normally
      console.log(`✅ Arquivo encontrado, servindo: ${request.attachmentFileName}`);
      
      // Set content type based on file mime type from database
      const mimeType = request.attachmentMimeType || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      
      // Add headers to ensure proper display in browser
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Set appropriate file extension based on mime type
      let extension = '.pdf';
      if (mimeType.includes('image/png')) extension = '.png';
      else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) extension = '.jpg';
      
      // Check if download is requested
      const forceDownload = req.query.download === '1';
      const disposition = forceDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="exame-${request.id}${extension}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error viewing attachment:", error);
      res.status(500).json({ message: "Erro ao visualizar anexo" });
    }
  });

  // View additional document
  app.get('/api/requests/:id/view-additional-document', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const request = await storage.getRequestById(parseInt(id));

      if (!request || !request.additionalDocumentFileName) {
        return res.status(404).json({ message: "Documento adicional não encontrado" });
      }

      const filePath = path.join(process.cwd(), 'uploads', request.additionalDocumentFileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      // Set content type based on file mime type from database
      const mimeType = request.additionalDocumentMimeType || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      
      // Add headers to ensure proper display in browser
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Set appropriate file extension based on mime type
      let extension = '.pdf';
      if (mimeType.includes('image/png')) extension = '.png';
      else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) extension = '.jpg';
      
      // Check if download is requested
      const forceDownload = req.query.download === '1';
      const disposition = forceDownload ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="documento-adicional-${request.id}${extension}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error viewing additional document:", error);
      res.status(500).json({ message: "Erro ao visualizar documento adicional" });
    }
  });

  // Download additional document
  app.get('/api/requests/:id/download-additional-document', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const request = await storage.getRequestById(parseInt(id));

      if (!request || !request.additionalDocumentFileName) {
        return res.status(404).json({ message: "Documento adicional não encontrado" });
      }

      const filePath = path.join(process.cwd(), 'uploads', request.additionalDocumentFileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      res.download(filePath, `documento-adicional-${request.id}.pdf`);
    } catch (error) {
      console.error("Error downloading additional document:", error);
      res.status(500).json({ message: "Erro ao visualizar documento adicional" });
    }
  });

  // Check for duplicate requests within 30 days
  app.post('/api/requests/check-duplicates', async (req, res) => {
    try {
      const { patientId, examTypeIds, consultationTypeIds } = req.body;
      
      if (!patientId) {
        return res.status(400).json({ message: 'ID do paciente é obrigatório' });
      }

      // Get all requests for this patient from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRequests = await storage.getPatientRequests(patientId);
      const last30DaysRequests = recentRequests.filter(req => {
        const createdAt = new Date(req.createdAt!);
        return createdAt >= thirtyDaysAgo;
      });

      const duplicates = [];

      // Check exam duplicates
      if (examTypeIds && examTypeIds.length > 0) {
        for (const examId of examTypeIds) {
          const duplicate = last30DaysRequests.find(req => 
            req.examTypeId === parseInt(examId) && 
            req.status !== 'rejected' && 
            req.status !== 'cancelled'
          );
          if (duplicate) {
            duplicates.push({
              type: 'exam',
              id: examId,
              name: duplicate.examType?.name || 'Exame',
              requestId: duplicate.id,
              createdAt: duplicate.createdAt
            });
          }
        }
      }

      // Check consultation duplicates
      if (consultationTypeIds && consultationTypeIds.length > 0) {
        for (const consultationId of consultationTypeIds) {
          const duplicate = last30DaysRequests.find(req => 
            req.consultationTypeId === parseInt(consultationId) && 
            req.status !== 'rejected' && 
            req.status !== 'cancelled'
          );
          if (duplicate) {
            duplicates.push({
              type: 'consultation',
              id: consultationId,
              name: duplicate.consultationType?.name || 'Consulta',
              requestId: duplicate.id,
              createdAt: duplicate.createdAt
            });
          }
        }
      }

      res.json({ duplicates });
    } catch (error) {
      console.error('Error checking duplicates:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Secretary routes
  app.get("/api/secretary/pending-requests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get month and year from query params, don't default if not provided
      const currentDate = new Date();
      const month = req.query.month ? parseInt(req.query.month) : undefined;
      const year = req.query.year ? parseInt(req.query.year) : undefined;
      const includeForwarded = req.query.includeForwarded === 'true';
      const includeReceived = req.query.includeReceived === 'true';
      const futureMonthOnly = req.query.futureMonthOnly === 'true';
      const forwardedMonth = req.query.forwardedMonth ? parseInt(req.query.forwardedMonth) : undefined;
      const forwardedYear = req.query.forwardedYear ? parseInt(req.query.forwardedYear) : undefined;

      // Only use month/year filter for non-forwarded requests
      const finalMonth = (includeForwarded && forwardedMonth) ? undefined : month;
      const finalYear = (includeForwarded && forwardedYear) ? undefined : year;

      const requests = await storage.getPendingSecretaryRequests(finalMonth, finalYear, includeForwarded, forwardedMonth, forwardedYear, includeReceived, futureMonthOnly);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending secretary requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.patch("/api/secretary/approve-request/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const requestId = parseInt(req.params.id);

      // Get current request before approving
      const currentRequest = await storage.getRequestById(requestId);
      if (!currentRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      const request = await storage.approveSecretaryRequest(requestId);

      // Create activity log for approval
      const requestType = currentRequest.examType ? 'exam' : 'consultation';
      const requestName = currentRequest.examType?.name || currentRequest.consultationType?.name || 'N/A';

      const secretaryName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const roleDisplay = user.role === 'admin' ? 'Administrador' : 'Secretário(a)';
      const typeText = requestType === 'exam' ? 'exame' : 'consulta';
      
      await storage.createActivityLog({
        userId: user.id,
        userName: secretaryName,
        userRole: user.role,
        requestId: request.id,
        patientName: currentRequest.patient.name,
        action: 'approved',
        actionDescription: `${roleDisplay} ${secretaryName} aprovou a requisição de ${typeText} "${requestName}" do paciente ${currentRequest.patient.name}`,
        requestType,
        requestName,
        oldStatus: 'Aguardando Análise',
        newStatus: 'received',
      });

      res.json(request);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.patch("/api/secretary/bulk-approve-requests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { requestIds } = req.body;
      
      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ message: "Request IDs array is required" });
      }

      const results = {
        approvedCount: 0,
        failedCount: 0,
        errors: [] as string[]
      };

      // Process each request individually
      for (const requestId of requestIds) {
        try {
          const parsedId = parseInt(requestId);
          if (isNaN(parsedId)) {
            results.failedCount++;
            results.errors.push(`ID inválido: ${requestId}`);
            continue;
          }

          // Get current request before approving
          const currentRequest = await storage.getRequestById(parsedId);
          if (!currentRequest) {
            results.failedCount++;
            results.errors.push(`Requisição ${parsedId} não encontrada`);
            continue;
          }

          // Approve the request
          await storage.approveSecretaryRequest(parsedId);

          // Create activity log for approval
          const requestType = currentRequest.examType ? 'exam' : 'consultation';
          const requestName = currentRequest.examType?.name || currentRequest.consultationType?.name || 'N/A';

          const secretaryName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
          const roleDisplay = user.role === 'admin' ? 'Administrador' : 'Secretário(a)';
          const typeText = requestType === 'exam' ? 'exame' : 'consulta';
          
          await storage.createActivityLog({
            userId: user.id,
            userName: secretaryName,
            userRole: user.role,
            requestId: parsedId,
            patientName: currentRequest.patient.name,
            action: 'approved',
            actionDescription: `${roleDisplay} ${secretaryName} aprovou a requisição de ${typeText} "${requestName}" do paciente ${currentRequest.patient.name} (Aprovação em massa)`,
            requestType,
            requestName,
            oldStatus: 'Aguardando Análise',
            newStatus: 'received',
          });

          results.approvedCount++;
        } catch (error) {
          console.error(`Error approving request ${requestId}:`, error);
          results.failedCount++;
          results.errors.push(`Erro ao aprovar requisição ${requestId}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error in bulk approve requests:", error);
      res.status(500).json({ message: "Failed to process bulk approval" });
    }
  });

  app.patch("/api/secretary/reject-request/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const requestId = parseInt(req.params.id);

      // Get current request before rejecting
      const currentRequest = await storage.getRequestById(requestId);
      if (!currentRequest) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      // Create activity log for rejection before deleting
      const requestType = currentRequest.examType ? 'exam' : 'consultation';
      const requestName = currentRequest.examType?.name || currentRequest.consultationType?.name || 'N/A';

      const secretaryName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const roleDisplay = user.role === 'admin' ? 'Administrador' : 'Secretário(a)';
      const typeText = requestType === 'exam' ? 'exame' : 'consulta';
      
      await storage.createActivityLog({
        userId: user.id,
        userName: secretaryName,
        userRole: user.role,
        requestId: currentRequest.id,
        patientName: currentRequest.patient.name,
        action: 'rejected',
        actionDescription: `${roleDisplay} ${secretaryName} rejeitou a requisição de ${typeText} "${requestName}" do paciente ${currentRequest.patient.name}`,
        requestType,
        requestName,
        oldStatus: 'Aguardando Análise',
        newStatus: 'rejected',
      });

      const request = await storage.rejectSecretaryRequest(requestId);
      res.json({ message: "Requisição rejeitada e excluída do sistema", request });
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // Secretary dashboard routes
  app.get("/api/secretary/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getSecretaryDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching secretary dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/secretary/dashboard/quota-usage", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { year, month } = req.query;
      console.log(`=== QUOTA USAGE ENDPOINT ===`);
      console.log('User:', user.username, 'Role:', user.role);
      console.log('Query params - Year:', year, 'Month:', month);

      const quotaUsage = await storage.getMonthlyQuotaUsage(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined
      );

      console.log('Quota usage response:', quotaUsage);
      console.log('=== FIM QUOTA USAGE ENDPOINT ===');

      // Adicionar headers para evitar cache
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(quotaUsage);
    } catch (error) {
      console.error("Error fetching quota usage:", error);
      res.status(500).json({ message: "Failed to fetch quota usage" });
    }
  });

  app.get("/api/secretary/dashboard/spending", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { year, month } = req.query;
      console.log(`=== SECRETARY DASHBOARD SPENDING DEBUG ===`);
      console.log(`API /api/secretary/dashboard/spending chamada com year=${year}, month=${month}`);
      console.log('User role:', user.role);

      // Get received spending (only received status)
      const receivedSpending = await storage.getMonthlySpending(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined,
        ['received'] // Only received status
      );

      // Get confirmed spending (accepted, confirmed, completed requests)
      const confirmedSpending = await storage.getMonthlySpending(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined,
        ['accepted', 'confirmed', 'completed'] // Exclude received status
      );

      // Get forecast spending (pending approval requests)
      const forecastSpending = await storage.getMonthlySpending(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined,
        ['Aguardando Análise'] // Pending status
      );

      console.log('Received spending result:', receivedSpending.length, 'items');
      console.log('Confirmed spending result:', confirmedSpending.length, 'items');
      console.log('Forecast spending result:', forecastSpending.length, 'items');
      console.log(`=== END SECRETARY DASHBOARD SPENDING DEBUG ===`);

      // Adicionar headers para evitar cache
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        received: receivedSpending,
        confirmed: confirmedSpending,
        forecast: forecastSpending
      });
    } catch (error) {
      console.error("Error fetching spending data:", error);
      res.status(500).json({ message: "Failed to fetch spending data" });
    }
  });

  app.get("/api/reports/monthly-authorizations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { year, month } = req.query;
      console.log(`API /api/reports/monthly-authorizations chamada com year=${year}, month=${month}`);

      const report = await storage.getMonthlyAuthorizationsReport(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined
      );

      console.log('Dados do relatório que serão enviados:', report);

      // Adicionar headers para evitar cache
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(report);
    } catch (error) {
      console.error("Error fetching monthly authorizations report:", error);
      res.status(500).json({ message: "Failed to fetch monthly authorizations report" });
    }
  });

  app.get("/api/secretary/dashboard/available-months", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const availableMonths = await storage.getAvailableMonths();
      res.json(availableMonths);
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ message: "Failed to fetch available months" });
    }
  });

  app.get("/api/secretary/dashboard/recent-activity", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const activity = await storage.getSecretaryRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Activity logs route
  app.get("/api/activity-logs", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Monthly authorizations report
  app.get("/api/reports/monthly-authorizations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { year, month } = req.query;
      const report = await storage.getMonthlyAuthorizationsReport(
        year ? parseInt(year as string) : undefined,
        month !== undefined ? parseInt(month as string) : undefined
      );
      res.json(report);
    } catch (error) {
      console.error("Error generating monthly authorizations report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Create new patient (public route for registration from StatusQuery)
  app.post("/api/patients", async (req, res) => {
    try {
      const patientData = req.body;

      // Validate required fields
      if (!patientData.name || !patientData.cpf || !patientData.age || !patientData.phone) {
        return res.status(400).json({ message: "Campos obrigatórios: nome, CPF, idade e telefone" });
      }

      // Clean CPF (remove formatting)
      patientData.cpf = patientData.cpf.replace(/\D/g, '');

      // Check if patient with this CPF already exists
      const existingPatient = await storage.getPatientByCpf(patientData.cpf);
      if (existingPatient) {
        return res.status(400).json({ message: "Já existe um paciente cadastrado com este CPF" });
      }

      // Convert age to number
      patientData.age = parseInt(patientData.age);

      // Convert birth date if provided
      if (patientData.birthDate) {
        patientData.birthDate = new Date(patientData.birthDate);
      }

      // Validate the patient data with schema
      const validatedPatientData = insertPatientSchema.parse(patientData);

      const newPatient = await storage.createPatient(validatedPatientData);
      res.status(200).json(newPatient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Erro ao cadastrar paciente" });
    }
  });

  // Patient ID photo upload (public access)
  app.post("/api/patients/:id/upload-id-photo", uploadPhoto.single('photo'), async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { photoType } = req.body; // 'front' or 'back'

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem enviada" });
      }

      if (photoType !== 'front' && photoType !== 'back') {
        return res.status(400).json({ message: "Tipo de foto inválido. Use 'front' ou 'back'" });
      }

      const updateData = photoType === 'front' 
        ? { idPhotoFront: req.file.filename }
        : { idPhotoBack: req.file.filename };

      const patient = await storage.updatePatient(patientId, updateData);

      // Create activity log for photo upload (skip for public uploads to avoid null user_id errors)
      try {
        const photoTypeText = photoType === 'front' ? 'frente' : 'verso';
        // For now, skip activity log creation for public photo uploads
        console.log(`Foto ${photoTypeText} enviada para paciente ${patient.name} via acesso público`);
      } catch (error) {
        console.log('Activity log skipped for public photo upload:', error.message);
      }

      res.json(patient);
    } catch (error) {
      console.error("Error uploading ID photo:", error);
      res.status(500).json({ message: "Erro ao fazer upload da foto" });
    }
  });

  // View patient ID photo
  app.get("/api/patients/:id/id-photo/:type", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const photoType = req.params.type; // 'front' or 'back'

      if (photoType !== 'front' && photoType !== 'back') {
        return res.status(400).json({ message: "Tipo de foto inválido" });
      }

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      const filename = photoType === 'front' ? patient.idPhotoFront : patient.idPhotoBack;
      if (!filename) {
        return res.status(404).json({ message: "Foto não encontrada" });
      }

      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error("Error viewing ID photo:", error);
      res.status(500).json({ message: "Erro ao visualizar foto" });
    }
  });

  // Delete patient ID photo
  app.delete("/api/patients/:id/delete-id-photo/:type", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const photoType = req.params.type; // 'front' or 'back'

      if (photoType !== 'front' && photoType !== 'back') {
        return res.status(400).json({ message: "Tipo de foto inválido" });
      }

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      const filename = photoType === 'front' ? patient.idPhotoFront : patient.idPhotoBack;

      // Remove file from filesystem if it exists
      if (filename) {
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Update database
      const updateData = photoType === 'front' 
        ? { idPhotoFront: null }
        : { idPhotoBack: null };

      const updatedPatient = await storage.updatePatient(patientId, updateData);

      // Create activity log for photo deletion
      const photoTypeText = photoType === 'front' ? 'frente' : 'verso';
      await storage.createActivityLog({
        userId: null,
        userName: 'Sistema Público',
        userRole: 'public',
        requestId: null,
        patientName: updatedPatient.name,
        action: 'deleted',
        actionDescription: `Paciente ${updatedPatient.name} excluiu foto da ${photoTypeText} do documento de identidade`,
        requestType: 'photo_deletion',
        requestName: `Foto ${photoTypeText} da identidade`,
        oldStatus: null,
        newStatus: null,
      });

      res.json({ message: "Foto removida com sucesso", patient: updatedPatient });
    } catch (error) {
      console.error("Error deleting ID photo:", error);
      res.status(500).json({ message: "Erro ao remover foto" });
    }
  });

  // Upload additional document
  app.post("/api/patients/:id/upload-document", uploadPhoto.single('document'), async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.id);

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum documento enviado" });
      }

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      // For now, we'll just acknowledge the upload
      // In a more complete system, you might want to store document metadata in the database
      res.json({ 
        message: "Documento enviado com sucesso",
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Erro ao fazer upload do documento" });
    }
  });



  // Patient search (authenticated route)
  app.get("/api/patients/search", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'recepcao' && user.role !== 'regulacao' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const query = req.query.q as string;
      console.log("🔍 SEARCH DEBUG - Query:", query);

      if (!query || query.length < 2) {
        console.log("🔍 SEARCH DEBUG - Query too short, returning empty array");
        return res.json([]);
      }

      const patients = await storage.searchPatients(query);
      console.log("🔍 SEARCH DEBUG - Found patients:", patients.length);
      res.json(patients);
    } catch (error) {
      console.error("Error searching patients:", error);
      res.status(500).json({ message: "Erro ao buscar pacientes" });
    }
  });

  // Get patient by CPF (authenticated route)
  app.get("/api/patients/by-cpf/:cpf", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(403).json({ message: "Access denied" });
      }

      const cpf = req.params.cpf.replace(/\D/g, ''); // Remove non-digits
      const patient = await storage.getPatientByCpf(cpf);

      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      res.json(patient);
    } catch (error) {
      console.error("Error searching patient by CPF:", error);
      res.status(500).json({ message: "Erro ao buscar paciente" });
    }
  });



  // Função para validar CPF
  function isValidCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return cpf[9] === digit1.toString() && cpf[10] === digit2.toString();
  }

  // Patient search by CPF (public route with rate limiting)
  app.get("/api/patients/search-by-cpf/:cpf", async (req, res) => {
    try {
      const cpf = req.params.cpf.replace(/\D/g, ''); // Remove non-digits

      // Validar CPF
      if (!isValidCPF(cpf)) {
        return res.status(400).json({ message: "CPF inválido" });
      }

      const result = await storage.getPatientRequestsByCpf(cpf);

      if (!result) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error searching patient by CPF:", error);
      res.status(500).json({ message: "Erro ao buscar paciente" });
    }
  });

  // Patients
  app.get('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin' && user.role !== 'recepcao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const patient = await storage.getPatient(parseInt(id));

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.patch('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin' && user.role !== 'recepcao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const updateData = req.body;
      const patientId = parseInt(id);

      // Get existing patient for comparison
      const existingPatient = await storage.getPatient(patientId);
      if (!existingPatient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      // Process birthDate if provided and calculate age automatically
      if (updateData.birthDate) {
        // Handle both string and Date inputs
        const birthDate = typeof updateData.birthDate === 'string' 
          ? new Date(updateData.birthDate) 
          : updateData.birthDate;
        

        
        // Validate the date
        if (isNaN(birthDate.getTime())) {
          return res.status(400).json({ message: "Data de nascimento inválida" });
        }
        
        updateData.birthDate = birthDate;
        
        // Calculate age automatically
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        updateData.age = age;
      }

      const updatedPatient = await storage.updatePatient(patientId, updateData);

      // Create activity log for authenticated user update
      const changes = [];
      if (updateData.name && updateData.name !== existingPatient.name) {
        changes.push(`nome alterado para "${updateData.name}"`);
      }
      if (updateData.phone && updateData.phone !== existingPatient.phone) {
        changes.push(`telefone alterado para "${updateData.phone}"`);
      }
      if (updateData.address && updateData.address !== existingPatient.address) {
        changes.push(`endereço atualizado`);
      }
      if (updateData.socialName && updateData.socialName !== existingPatient.socialName) {
        changes.push(`nome social alterado`);
      }
      if (updateData.age && updateData.age !== existingPatient.age) {
        changes.push(`idade alterada para ${updateData.age}`);
      }
      if (updateData.birthDate && updateData.birthDate !== existingPatient.birthDate) {
        changes.push(`data de nascimento atualizada`);
      }

      const changeDescription = changes.length > 0 ? changes.join(', ') : 'dados atualizados';
      const userDisplayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      const userRoleDisplay = user.role === 'recepcao' ? 'Atendente' : 
                             user.role === 'regulacao' ? 'Regulação' : 
                             user.role === 'admin' ? 'Administrador' : user.role;
      
      await storage.createActivityLog({
        userId: user.id,
        userName: userDisplayName,
        userRole: user.role,
        requestId: null,
        patientName: updatedPatient.name,
        action: 'updated',
        actionDescription: `${userRoleDisplay} ${userDisplayName} atualizou dados do paciente ${updatedPatient.name}: ${changeDescription}`,
        requestType: 'patient_update',
        requestName: `Dados do paciente ${updatedPatient.name}`,
        oldStatus: null,
        newStatus: null,
      });

      res.json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ message: "Erro ao atualizar dados do paciente" });
    }
  });

  app.get('/api/patients/:id/requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin' && user.role !== 'recepcao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const requests = await storage.getPatientRequests(parseInt(id));
      

      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching patient requests:", error);
      res.status(500).json({ message: "Failed to fetch patient requests" });
    }
  });

  // Users
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { role } = req.query;
      if (role && typeof role === 'string') {
        const users = await storage.getUsersByRole(role);
        const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
        res.json(usersWithoutPasswords);
      } else {
        // Return all users if no role specified
        const allUsers = await storage.getUsersByRole('');
        const usersWithoutPasswords = allUsers.map(({ password: _, ...user }) => user);
        res.json(usersWithoutPasswords);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Custom authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    if (req.session && req.session.userId) {
      // User is authenticated
      next();
    } else {
      // User is not authenticated
      res.status(401).json({ message: "Unauthorized" });
    }
  }

  // Get all suspended requests (for admin panel) - MUST be before /:id route
  app.get('/api/requests/suspended', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log(`🔍 Searching for suspended requests...`);
      
      // Use raw SQL query to ensure we get the suspended requests
      const result = await pool.query(`
        SELECT 
          r.*,
          p.name as patient_name,
          p.social_name as patient_social_name,
          p.cpf as patient_cpf,
          p.age as patient_age,
          et.name as exam_type_name,
          ct.name as consultation_type_name,
          u.first_name || ' ' || u.last_name as doctor_name,
          hu.name as health_unit_name
        FROM requests r
        LEFT JOIN patients p ON r.patient_id = p.id
        LEFT JOIN exam_types et ON r.exam_type_id = et.id
        LEFT JOIN consultation_types ct ON r.consultation_type_id = ct.id
        LEFT JOIN users u ON r.doctor_id = u.id
        LEFT JOIN health_units hu ON r.health_unit_id = hu.id
        WHERE r.status = 'suspenso'
        ORDER BY r.created_at DESC
      `);

      const suspendedRequests = result.rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        suspendedAt: row.updated_at,
        suspensionReason: row.notes,
        patient: {
          id: row.patient_id,
          name: row.patient_name,
          socialName: row.patient_social_name,
          cpf: row.patient_cpf,
          age: row.patient_age
        },
        examType: row.exam_type_name ? { name: row.exam_type_name } : null,
        consultationType: row.consultation_type_name ? { name: row.consultation_type_name } : null,
        doctor: {
          name: row.doctor_name
        },
        healthUnit: {
          name: row.health_unit_name
        }
      }));
      
      console.log(`📋 Found ${suspendedRequests.length} suspended requests using raw SQL`);
      res.json(suspendedRequests);
    } catch (error) {
      console.error("Error fetching suspended requests:", error);
      res.status(500).json({ message: "Erro ao buscar requisições suspensas" });
    }
  });

  // Get single request by ID
  app.get("/api/requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'regulacao' && user.role !== 'admin' && user.role !== 'recepcao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const requestId = parseInt(req.params.id);
      const request = await storage.getRequestById(requestId);

      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error fetching request:", error);
      res.status(500).json({ message: "Erro ao buscar requisição" });
    }
  });

  // Check specific request details
  app.get("/api/requests/:id/details", isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getRequestById(requestId);

      if (!request) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      const details = {
        id: request.id,
        patientName: request.patient.name,
        status: request.status,
        examType: request.examType?.name || null,
        consultationType: request.consultationType?.name || null,
        hasAttachment: !!request.attachmentFileName,
        attachmentDetails: request.attachmentFileName ? {
          fileName: request.attachmentFileName,
          fileSize: request.attachmentFileSize,
          mimeType: request.attachmentMimeType,
          uploadedAt: request.attachmentUploadedAt,
          uploadedBy: request.attachmentUploadedBy
        } : null,
        hasResult: !!request.resultFileName,
        resultDetails: request.resultFileName ? {
          fileName: request.resultFileName,
          fileSize: request.resultFileSize,
          mimeType: request.resultMimeType,
          uploadedAt: request.resultUploadedAt,
          uploadedBy: request.resultUploadedBy
        } : null,
        hasAdditionalDocument: !!request.additionalDocumentFileName,
        additionalDocumentDetails: request.additionalDocumentFileName ? {
          fileName: request.additionalDocumentFileName,
          fileSize: request.additionalDocumentFileSize,
          mimeType: request.additionalDocumentMimeType,
          uploadedAt: request.additionalDocumentUploadedAt,
          uploadedBy: request.additionalDocumentUploadedBy
        } : null
      };

      res.json(details);
    } catch (error) {
      console.error("Error fetching request details:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes da requisição" });
    }
  });

  // Monthly spending endpoint
  app.get("/api/spending/monthly", requireAuth, async (req: any, res: any) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) : undefined;

      console.log(`=== SPENDING ENDPOINT REQUEST ===`);
      console.log('Year:', year, 'Month:', month);
      console.log('Query params:', req.query);

      // Use the monthly spending method directly for consistency
      const spending = await storage.getMonthlySpending(year, month);

      console.log(`=== SPENDING ENDPOINT RESPONSE ===`);
      console.log('Total de itens retornados:', spending.length);
      console.log('Dados de gastos:', JSON.stringify(spending, null, 2));
      console.log('Valor total:', spending.reduce((sum, item) => sum + (item.totalSpent || 0), 0));
      console.log('=== FIM RESPONSE ===');

      // Adicionar headers para evitar cache
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(spending);
    } catch (error: any) {
      console.error("Erro ao buscar gastos mensais:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Backup and Restore endpoints
  const execAsync = promisify(exec);

  // Check database connection
  app.get("/api/database/status", async (req, res) => {
    try {
      await db.execute(`SELECT 1`);
      res.json({ connected: true, message: "Banco conectado" });
    } catch (error) {
      console.error("Database connection error:", error);
      res.json({ connected: false, message: "Banco não conectado" });
    }
  });

  // Database setup endpoint - Create all tables and initial data
  app.post('/api/database/setup', async (req, res) => {
    try {
      console.log('Starting database setup...');
      
      const { dbName, dbUser, dbPassword } = req.body || {};
      
      // Gerar senha automática se não fornecida
      const finalPassword = dbPassword || bcrypt.genSaltSync(10).substring(7);
      const finalDbName = dbName || 'health_system';
      const finalDbUser = dbUser || 'health_admin';
      
      console.log(`Setup request for DB: ${finalDbName}, User: ${finalDbUser}`);

      // Se configuração personalizada foi fornecida, criar banco PostgreSQL
      if (dbName || dbUser || dbPassword) {
        try {
          const execAsync = promisify(exec);
          
          // Criar banco e usuário PostgreSQL
          const createDbScript = `
            sudo -u postgres psql << EOF
            CREATE DATABASE ${finalDbName};
            CREATE USER ${finalDbUser} WITH PASSWORD '${finalPassword}';
            GRANT ALL PRIVILEGES ON DATABASE ${finalDbName} TO ${finalDbUser};
            ALTER USER ${finalDbUser} CREATEDB;
            \\q
            EOF
          `;
          
          await execAsync(createDbScript);
          console.log('PostgreSQL database and user created successfully');
          
          // Atualizar DATABASE_URL para o novo banco
          const newDatabaseUrl = `postgresql://${finalDbUser}:${finalPassword}@localhost:5432/${finalDbName}`;
          process.env.DATABASE_URL = newDatabaseUrl;
          
          // Criar arquivo .env com as novas configurações
          const crypto = await import('crypto');
          const envContent = `NODE_ENV=production
PORT=3000
DATABASE_URL=${newDatabaseUrl}
PGHOST=localhost
PGPORT=5432
PGUSER=${finalDbUser}
PGDATABASE=${finalDbName}
PGPASSWORD=${finalPassword}
SESSION_SECRET=${crypto.default.randomBytes(64).toString('base64')}
`;
          
          const envPath = path.join(process.cwd(), '.env');
          
          // Backup do .env existente se houver
          if (fs.existsSync(envPath)) {
            const backupPath = `${envPath}.backup.${Date.now()}`;
            fs.copyFileSync(envPath, backupPath);
            console.log(`Backup do .env criado em: ${backupPath}`);
          }
          
          // Escrever novo .env
          fs.writeFileSync(envPath, envContent);
          console.log('Arquivo .env criado/atualizado com sucesso');
          
          res.json({ 
            success: true, 
            message: 'Banco de dados personalizado criado com sucesso',
            details: `Banco: ${finalDbName}, Usuário: ${finalDbUser}, Senha: ${finalPassword}`,
            connectionString: newDatabaseUrl,
            envCreated: true,
            envPath: envPath
          });
          return;
          
        } catch (dbError) {
          console.error('Failed to create custom database:', dbError);
          // Continue with default setup below
        }
      }

      // Usar configuração existente (fallback)
      const sqlFile = path.join(process.cwd(), 'create-tables.sql');
      
      // Check if SQL file exists
      if (!fs.existsSync(sqlFile)) {
        // Create minimal database structure
        await db.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'recepcao',
            email VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            health_unit_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);

        // Create admin user if doesn't exist
        try {
          const existingAdmin = await storage.getUserByUsername('admin');
          if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.execute(`
              INSERT INTO users (username, password, role, first_name, last_name) 
              VALUES ('admin', '${hashedPassword}', 'admin', 'Administrador', 'Sistema')
            `);
          }
        } catch (error) {
          console.log('Admin user creation issue:', error);
        }

        // Criar arquivo .env mesmo para configuração padrão
        const crypto = await import('crypto');
        const envContent = `NODE_ENV=production
PORT=3000
DATABASE_URL=${process.env.DATABASE_URL}
PGHOST=localhost
PGPORT=5432
PGUSER=${process.env.PGUSER || 'postgres'}
PGDATABASE=${process.env.PGDATABASE || 'postgres'}
PGPASSWORD=${process.env.PGPASSWORD || ''}
SESSION_SECRET=${crypto.default.randomBytes(64).toString('base64')}
`;
        
        const envPath = path.join(process.cwd(), '.env');
        
        // Backup do .env existente se houver
        if (fs.existsSync(envPath)) {
          const backupPath = `${envPath}.backup.${Date.now()}`;
          fs.copyFileSync(envPath, backupPath);
          console.log(`Backup do .env criado em: ${backupPath}`);
        }
        
        // Escrever novo .env
        fs.writeFileSync(envPath, envContent);
        console.log('Arquivo .env criado/atualizado com sucesso');

        res.json({ 
          success: true, 
          message: 'Configuração básica criada com sucesso',
          details: dbName ? `Banco personalizado: ${finalDbName}, Usuário: ${finalDbUser}` : 'Usuário admin criado para acesso inicial',
          envCreated: true,
          envPath: envPath
        });
        return;
      }

      // Execute the SQL file
      try {
        const execAsync = promisify(exec);
        await execAsync(`psql "${process.env.DATABASE_URL}" -f "${sqlFile}"`, {
          env: { ...process.env }
        });
        console.log('SQL file executed successfully');
      } catch (error) {
        console.log('SQL file execution failed, trying direct approach');
        
        // Fallback: create admin user directly
        try {
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await db.execute(`
            INSERT INTO users (username, password, role, first_name, last_name) 
            VALUES ('admin', '${hashedPassword}', 'admin', 'Administrador', 'Sistema')
            ON CONFLICT (username) DO NOTHING
          `);
        } catch (adminError) {
          console.log('Admin creation also failed:', adminError);
        }
      }

      res.json({ 
        success: true, 
        message: 'Banco de dados configurado com sucesso',
        details: dbName ? `Banco personalizado: ${finalDbName}, Usuário: ${finalDbUser}` : 'Sistema pronto para uso com usuário admin'
      });

    } catch (error: any) {
      console.error('Database setup error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao configurar banco de dados',
        error: error.message 
      });
    }
  });

  // Create backup
  app.post("/api/database/backup", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-health-system-${timestamp}.sql`;
      const backupPath = path.join(process.cwd(), 'uploads', backupName);

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return res.status(500).json({ message: "DATABASE_URL não configurada" });
      }

      // Parse database URL
      const url = new URL(dbUrl);
      const dbName = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;
      const host = url.hostname;
      const port = url.port || '5432';

      // Create comprehensive backup using pg_dump with options to avoid constraint conflicts
      const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} --verbose --data-only --inserts --column-inserts --disable-triggers --no-owner --no-privileges > "${backupPath}"`;
      
      console.log("Criando backup completo com todas as tabelas e dados...");
      await execAsync(command, { maxBuffer: 100 * 1024 * 1024 }); // 100MB buffer

      // Check if backup file was created and validate content
      if (!fs.existsSync(backupPath)) {
        return res.status(500).json({ message: "Falha ao criar backup" });
      }

      const stats = fs.statSync(backupPath);
      
      // Verify backup has minimum expected content
      if (stats.size < 5000) { // Less than 5KB suggests incomplete backup
        fs.unlinkSync(backupPath);
        return res.status(500).json({ message: "Backup criado mas está incompleto" });
      }

      // Verify backup contains essential tables and data
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const essentialTables = ['users', 'patients', 'requests', 'health_units', 'exam_types', 'consultation_types'];
      const tableStatus = essentialTables.map(table => ({
        table,
        hasStructure: backupContent.includes(`CREATE TABLE public.${table}`),
        hasData: backupContent.includes(`INSERT INTO public.${table}`) || backupContent.includes(`COPY public.${table}`)
      }));

      const missingStructure = tableStatus.filter(t => !t.hasStructure).map(t => t.table);
      const missingData = tableStatus.filter(t => !t.hasData).map(t => t.table);

      console.log(`Backup criado: ${backupName} (${(stats.size / 1024).toFixed(2)} KB)`);
      console.log(`Tabelas com estrutura: ${tableStatus.filter(t => t.hasStructure).length}/${essentialTables.length}`);
      console.log(`Tabelas com dados: ${tableStatus.filter(t => t.hasData).length}/${essentialTables.length}`);

      res.json({
        message: "Backup criado com sucesso",
        filename: backupName,
        size: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        tablesIncluded: essentialTables.length,
        tablesWithData: tableStatus.filter(t => t.hasData).length,
        warnings: missingData.length > 0 ? `Tabelas sem dados: ${missingData.join(', ')}` : null,
        created: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: "Erro ao criar backup: " + (error as Error).message });
    }
  });

  // Configure multer for SQL backup files
  const backupUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `restore-${uniqueSuffix}-${file.originalname}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/sql' || file.originalname.endsWith('.sql')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos .sql são permitidos para backup'));
      }
    },
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB limit for backups
    }
  });

  // Upload and restore backup
  app.post("/api/database/restore", backupUpload.single('backup'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Arquivo de backup não enviado" });
      }

      const backupPath = req.file.path;
      
      // Verify it's a SQL file
      if (!req.file.originalname.endsWith('.sql')) {
        fs.unlinkSync(backupPath); // Clean up
        return res.status(400).json({ message: "Apenas arquivos .sql são aceitos" });
      }

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return res.status(500).json({ message: "DATABASE_URL não configurada" });
      }

      // Parse database URL
      const url = new URL(dbUrl);
      const dbName = url.pathname.slice(1);
      const user = url.username;
      const password = url.password;
      const host = url.hostname;
      const port = url.port || '5432';

      // Enhanced restore process with better error handling and validation
      console.log("Iniciando restauração completa do backup...");
      
      // Validate backup file content before restore
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const essentialTables = ['users', 'patients', 'requests', 'health_units', 'exam_types', 'consultation_types'];
      const hasEssentialData = essentialTables.every(table => 
        backupContent.includes(`CREATE TABLE public.${table}`) || 
        backupContent.includes(`INSERT INTO public.${table}`) ||
        backupContent.includes(`COPY public.${table}`)
      );

      if (!hasEssentialData) {
        fs.unlinkSync(backupPath);
        return res.status(400).json({ 
          message: "Arquivo de backup inválido - não contém todas as tabelas essenciais",
          missingTables: essentialTables.filter(table => 
            !backupContent.includes(`CREATE TABLE public.${table}`) && 
            !backupContent.includes(`INSERT INTO public.${table}`) &&
            !backupContent.includes(`COPY public.${table}`)
          )
        });
      }

      // Clear ALL existing data before restoration - complete replacement
      console.log("Removendo TODOS os dados existentes para substituição completa...");
      try {
        // First, disable all foreign key constraints temporarily if possible
        await db.execute('SET session_replication_role = replica').catch(() => {
          console.log("Não foi possível desabilitar foreign keys - continuando...");
        });
        
        // Clear ALL tables completely in dependency order
        const tablesToClear = [
          'activity_logs',    // No dependencies
          'requests',         // Depends on patients, users, health_units, exam_types, consultation_types
          'patients',         // No FK dependencies 
          'users',           // Depends on health_units
          'sessions',        // No FK dependencies but clear it too
          'health_units',    // No dependencies
          'exam_types',      // No dependencies  
          'consultation_types' // No dependencies
        ];
        
        for (const table of tablesToClear) {
          try {
            // Try TRUNCATE first (best option - resets sequences)
            await db.execute(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
            console.log(`✓ Tabela ${table} completamente limpa com TRUNCATE`);
          } catch (truncateError) {
            // If TRUNCATE fails, use DELETE + reset sequence
            try {
              await db.execute(`DELETE FROM ${table}`);
              
              // Reset the sequence manually
              const sequenceQuery = `SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)`;
              await db.execute(sequenceQuery).catch(() => {
                console.log(`Sequência para ${table} não resetada (pode não ter ID serial)`);
              });
              
              console.log(`✓ Tabela ${table} limpa com DELETE e sequência resetada`);
            } catch (deleteError) {
              console.warn(`⚠️ Erro ao limpar ${table}:`, (deleteError as any).message);
            }
          }
        }
        
        // Re-enable foreign key constraints
        await db.execute('SET session_replication_role = DEFAULT').catch(() => {
          console.log("Não foi possível reabilitar foreign keys");
        });
        
        // Verify tables are empty
        console.log("Verificando se todas as tabelas estão vazias...");
        for (const table of ['users', 'patients', 'requests', 'health_units', 'exam_types', 'consultation_types']) {
          try {
            const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
            const count = result.rows?.[0]?.count || 0;
            console.log(`- ${table}: ${count} registros`);
          } catch (error) {
            console.log(`- ${table}: erro ao verificar`);
          }
        }
        
        console.log("✅ TODOS os dados removidos - banco limpo para restauração");
        
      } catch (clearError) {
        console.error("❌ Erro crítico ao limpar dados:", clearError);
        throw clearError; // Stop restoration if clearing fails
      }

      // Declare validation results variable in the correct scope
      let validationResults: Array<{table: string, count: number, error?: boolean}> = [];

      // Use psql command for data restoration
      const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${dbName} -v ON_ERROR_STOP=0 -f "${backupPath}" 2>&1`;
      
      try {
        // Check if psql is available
        await execAsync('which psql');
        
        console.log("Executando restauração de dados do backup...");
        const result = await execAsync(command, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
        
        console.log("Resultado da restauração:", result.stdout);
        
        // Validate restoration by checking table counts individually
        try {
          for (const table of essentialTables) {
            try {
              const queryResult = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
              const count = queryResult.rows?.[0]?.count || 0;
              validationResults.push({ table, count: parseInt(count.toString()) });
            } catch (tableError) {
              console.error(`Erro ao verificar tabela ${table}:`, tableError);
              validationResults.push({ table, count: 0, error: true });
            }
          }
          
          console.log("Validação pós-restauração - contagem de registros:");
          validationResults.forEach(result => {
            console.log(`- ${result.table}: ${result.count} registros`);
          });
          
          // Check if critical tables have data
          const criticalTables = ['users', 'health_units', 'exam_types', 'consultation_types'];
          const emptyTables = validationResults.filter(result => 
            criticalTables.includes(result.table) && result.count === 0
          );
          
          if (emptyTables.length > 0) {
            console.warn("⚠️ Tabelas críticas vazias após restauração:", emptyTables.map(t => t.table));
          } else {
            console.log("✅ Todas as tabelas críticas restauradas com sucesso");
          }
        } catch (validationError) {
          console.error("Erro na validação pós-restauração:", validationError);
          // Set default validation results if validation fails
          validationResults = essentialTables.map(table => ({ table, count: 0, error: true }));
        }
        
        if (result.stderr) {
          console.log("Avisos da restauração:", result.stderr);
        }
        
      } catch (error: any) {
        console.error("Erro completo na restauração:", error);
        console.log("Comando executado:", command);
        
        if (error.stdout) {
          console.log("Saída padrão:", error.stdout);
        }
        if (error.stderr) {
          console.log("Saída de erro:", error.stderr);
        }
        
        // Check for specific error types
        if (error.code === 'ENOENT') {
          throw new Error("PostgreSQL (psql) não está instalado no sistema");
        }
        
        if (error.code === 'EMAXBUFFER') {
          throw new Error("Arquivo de backup muito grande para processar");
        }
        
        // Check if it's a connection error
        if (error.stderr && error.stderr.includes('could not connect')) {
          throw new Error("Não foi possível conectar ao banco de dados");
        }
        
        // Check for authentication errors
        if (error.stderr && error.stderr.includes('authentication failed')) {
          throw new Error("Erro de autenticação no banco de dados");
        }
        
        // Check for syntax errors in SQL
        if (error.stderr && error.stderr.includes('syntax error')) {
          throw new Error("Erro de sintaxe no arquivo SQL de backup");
        }
        
        // Generic error handling
        const errorMessage = error.stderr || error.stdout || error.message || "Erro desconhecido";
        throw new Error(`Falha na restauração: ${errorMessage}`);
      }

      // Clean up uploaded file
      fs.unlinkSync(backupPath);

      // Provide detailed restoration summary
      const restorationSummary = validationResults.map((result: any) => 
        `${result.table}: ${result.count} registros`
      ).join(', ');

      res.json({ 
        message: "Backup restaurado com sucesso - TODOS os dados foram completamente substituídos",
        details: `Dados restaurados: ${restorationSummary}`,
        tablesRestored: validationResults.length,
        totalRecords: validationResults.reduce((sum: number, result: any) => sum + result.count, 0),
        restored: new Date().toISOString(),
        warning: "Todos os dados anteriores foram removidos e substituídos pelo backup"
      });
    } catch (error) {
      console.error("Error restoring backup:", error);
      if (req.file) {
        fs.unlinkSync(req.file.path); // Clean up on error
      }
      res.status(500).json({ message: "Erro ao restaurar backup: " + (error as Error).message });
    }
  });

  // Download backup file
  app.get("/api/database/backup/:filename", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { filename } = req.params;
      const backupPath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(backupPath) || !filename.endsWith('.sql')) {
        return res.status(404).json({ message: "Arquivo de backup não encontrado" });
      }

      res.download(backupPath, filename);
    } catch (error) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ message: "Erro ao baixar backup" });
    }
  });

  // List backup files
  app.get("/api/database/backups", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const files = fs.readdirSync(uploadsDir)
        .filter(file => file.startsWith('backup-health-system-') && file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            created: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      res.json(files);
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ message: "Erro ao listar backups" });
    }
  });

  // Test preview page
  app.get("/test-preview", (req, res) => {
    res.sendFile(path.join(process.cwd(), "test-preview.html"));
  });

  // Health check for external connectivity
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      server: 'Sistema de Saúde Alexandria/RN',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // External access route - Landing page without authentication
  app.get("/external", (req, res) => {
    // Log external access
    console.log(`🌐 External Landing access from: ${req.get('host')} - ${req.get('user-agent')}`);
    
    // Set additional headers for external access
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    
    res.sendFile(path.join(process.cwd(), "client/index.html"));
  });

  // Public status check - allows external CPF consultation
  app.get("/public/status", (req, res) => {
    console.log(`🔍 Public status check from: ${req.get('host')}`);
    res.sendFile(path.join(process.cwd(), "client/index.html"));
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const role = req.query.role as string;
      const notifications = await storage.getNotifications(role);
      res.json(notifications);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get("/api/notifications/active", async (req, res) => {
    try {
      const role = req.query.role as string;
      const notifications = await storage.getActiveNotifications(role);
      res.json(notifications);
    } catch (error) {
      console.error('Erro ao buscar notificações ativas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { title, message, type, targetRole } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
      }

      const notification = await storage.createNotification({
        title,
        message,
        type: type || 'info',
        targetRole: targetRole || null,
        createdBy: user.id,
        isActive: true,
      });

      res.json(notification);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.put("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { title, message, type, targetRole, isActive } = req.body;

      const notification = await storage.updateNotification(parseInt(id), {
        title,
        message,
        type,
        targetRole,
        isActive,
      });

      res.json(notification);
    } catch (error) {
      console.error('Erro ao atualizar notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      await storage.deleteNotification(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.patch("/api/notifications/:id/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== 'admin' && user.role !== 'regulacao')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const notification = await storage.toggleNotificationStatus(parseInt(id));
      res.json(notification);
    } catch (error) {
      console.error('Erro ao alternar status da notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// This code removes the "Dr." prefix from the activity logs for exams and consultations.