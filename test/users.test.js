
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const UsersModel = require('../models/users');
const { encrypt } = require('../utils/handlePassword');
const { tokenSign } = require('../utils/handleJwt');

const api = request(app);

// Variables para el primer describe block (tests generales)
let generalTestToken; // Se usará como el token principal después del setup
let generalTestUserId;
const generalUserInitialEmail = `general-user-${Date.now()}@example.com`;
const generalUserInitialPassword = 'GeneralPassword123';
const generalUserInitialData = {
  email: generalUserInitialEmail, // Guardar email aquí también
  nombre: 'General',
  apellidos: 'Tester',
  nif: '00000000G'
};

// Variables para el describe block de login (si necesitas un usuario diferente al general)
const loginTestUserEmail = `login-user-${Date.now()}@example.com`;
const loginTestUserPassword = 'LoginPassword123';

// Variables para el describe block de validación
const validationTestUserEmail = `validation-user-${Date.now()}@example.com`;
const validationTestUserPassword = 'PasswordForValidation123';
let validationUserToken;
let validationUserId;
let correctVerificationCode;

// Variables para el describe block de /personal
// Usaremos generalTestToken y generalTestUserId para estos tests
const personalDataToUpdate = {
    nombre: "Agatha",
    apellidos: "García Pérez",
    nif: "87654321B" // Un NIF válido
};
const invalidPersonalDataNif = {
    nombre: "TestNombre",
    apellidos: "TestApellidos",
    nif: "NIFINVALIDO123"
};
const missingPersonalData = {
    apellidos: "Solo Apellidos", // Falta nombre
    nif: "11223344C"
};


// Datos de compañía para los tests
const companyDataToUpdate = {
  nombre: "Mi Empresa Actualizada SL",
  cif: "B87654321", // CIF único para este test
  street: "Calle Renovada",
  number: "100",
  postal: "28002",
  city: "Madrid",
  province: "Madrid"
};

const companyDataForAutonomo = { // Solo dirección, nombre y CIF se ignorarán para autonomo
  street: "Despacho Autónomo",
  number: "1A",
  postal: "28003",
  city: "Madrid",
  province: "Madrid"
};


beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await UsersModel.deleteMany({ email: { $regex: /@example\.com$/ } });
    console.log("Usuarios de prueba previos eliminados.");

    // Registrar y verificar el usuario principal (generalTestUser)
    const registerRes = await api
        .post('/api/user/register')
        .send({ email: generalUserInitialEmail, password: generalUserInitialPassword });

    if (registerRes.status !== 201) {
        console.error("FALLO EL REGISTRO DEL USUARIO GENERAL EN beforeAll:", registerRes.body);
        throw new Error("No se pudo registrar el usuario general para los tests.");
    }
    generalTestUserId = registerRes.body.user._id.toString(); // Asegurar que es string
    generalTestToken = registerRes.body.token;

    const userDb = await UsersModel.findById(generalTestUserId).select('+codigo');
    if (!userDb || !userDb.codigo) {
        throw new Error("No se encontró código de verificación para el usuario general.");
    }
    correctVerificationCode = userDb.codigo; // Guardar para el test de validación si este usuario se reusa

    const validationRes = await api
        .put('/api/user/validation')
        .set('Authorization', `Bearer ${generalTestToken}`)
        .send({ code: correctVerificationCode });

    if (validationRes.status !== 200 || !validationRes.body.acknowledged) {
        console.error("FALLO LA VALIDACIÓN DEL USUARIO GENERAL EN beforeAll:", validationRes.body);
        throw new Error("No se pudo validar el email del usuario general.");
    }

    // Volver a hacer login para obtener un token del usuario ya verificado
    const loginRes = await api
        .post('/api/user/login')
        .send({ email: generalUserInitialEmail, password: generalUserInitialPassword });
    if (loginRes.status !== 200) throw new Error("Fallo al hacer login del usuario general verificado en beforeAll");
    generalTestToken = loginRes.body.token; // Actualizar al token del usuario verificado

    // Establecer los datos personales iniciales para generalTestUser
    await UsersModel.findByIdAndUpdate(generalTestUserId, {
        nombre: generalUserInitialData.nombre,
        apellidos: generalUserInitialData.apellidos,
        nif: generalUserInitialData.nif
    });

    console.log(`Usuario general ${generalUserInitialEmail} (ID: ${generalTestUserId}) registrado, verificado y con datos personales iniciales.`);
});


describe('Endpoints de usuarios generales (usa generalTestUser)', () => {

    it('GET /api/user/me debe devolver el perfil del usuario autenticado', async () => {
      const response = await api
        .get('/api/user/me')
        .set('Authorization', `Bearer ${generalTestToken}`)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body._id).toBe(generalTestUserId);
      expect(response.body.email).toBe(generalUserInitialEmail);
      expect(response.body.nombre).toBe(generalUserInitialData.nombre);
    });

    it('POST /api/user/register debe registrar un nuevo usuario adicional', async () => {
      const newUserEmail = `nuevo-register-${Date.now()}@example.com`;
      const newUser = { email: newUserEmail, password: 'NuevoPassword123' };
      const response = await api
        .post('/api/user/register')
        .send(newUser)
        .expect(201);
      expect(response.body.user.email).toBe(newUserEmail);
      expect(response.body).toHaveProperty('token');
    });

    it('DELETE /api/user/me debe eliminar (soft) al usuario general', async () => {
      const response = await api
        .delete(`/api/user/me`)
        .set('Authorization', `Bearer ${generalTestToken}`)
        .expect(200);
      expect(response.body).toHaveProperty('message', 'USER_ACCOUNT_DEACTIVATED');
      const userInDb = await UsersModel.findOneDeleted({ _id: generalTestUserId });
      expect(userInDb).not.toBeNull();
      if (userInDb) expect(userInDb.deleted).toBe(true);
      await UsersModel.restore({_id: generalTestUserId }); // Restaurar para otros tests
    });
});


describe('POST /api/user/login', () => {
    beforeEach(async () => {
        await UsersModel.deleteMany({ email: loginTestUserEmail });
        const hashedPassword = await encrypt(loginTestUserPassword);
        await UsersModel.create({
            email: loginTestUserEmail,
            password: hashedPassword,
            status: true
        });
    });

    it('should login a verified user successfully (200)', async () => {
        const response = await api
            .post('/api/user/login')
            .send({ email: loginTestUserEmail, password: loginTestUserPassword })
            .expect(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(loginTestUserEmail);
    });

    it('should fail login for unverified user (401)', async () => {
        const unverifiedEmail = `unverified-login-${Date.now()}@example.com`;
        await api.post('/api/user/register').send({ email: unverifiedEmail, password: 'password' });
        const response = await api
            .post('/api/user/login')
            .send({ email: unverifiedEmail, password: 'password' })
            .expect(401);
        expect(response.body).toHaveProperty('message', 'USER_NOT_VALIDATED');
    });

    it('should fail login with incorrect password (404)', async () => {
        await api
            .post('/api/user/login')
            .send({ email: loginTestUserEmail, password: 'WrongPassword123' })
            .expect(404);
    });

    it('should fail login for non-existent user (404)', async () => {
        await api
            .post('/api/user/login')
            .send({ email: `nonexistent-${Date.now()}@example.com`, password: 'password' })
            .expect(404);
    });

    it('should fail login for soft-deleted user (401)', async () => {
        const user = await UsersModel.findOne({ email: loginTestUserEmail });
        if (user) await user.delete();
        const response = await api
            .post('/api/user/login')
            .send({ email: loginTestUserEmail, password: loginTestUserPassword })
            .expect(401);
        expect(response.body).toHaveProperty('message', 'USER_ACCOUNT_INACTIVE');
    });
});


describe('PUT /api/user/validation', () => {
    // Usa sus propias variables validationTestUserEmail, validationUserToken etc.
    beforeEach(async () => {
        await UsersModel.deleteMany({ email: validationTestUserEmail });
        const registerResponse = await api
            .post('/api/user/register')
            .send({ email: validationTestUserEmail, password: validationTestUserPassword });

        if (registerResponse.status !== 201) {
            console.error("FALLO REGISTRO EN beforeEach /validation:", registerResponse.body);
            throw new Error("Setup para /validation falló: No se pudo registrar.");
        }
        validationUserToken = registerResponse.body.token;
        validationUserId = registerResponse.body.user._id.toString();

        const userInDb = await UsersModel.findById(validationUserId).select('+codigo');
        if (!userInDb || !userInDb.codigo) {
            throw new Error('No se encontró código de verificación post-registro para /validation.');
        }
        correctVerificationCode = userInDb.codigo;
    });

    it('should verify email with correct code and token (200)', async () => {
        const response = await api
            .put('/api/user/validation')
            .set('Authorization', `Bearer ${validationUserToken}`)
            .send({ code: correctVerificationCode })
            .expect(200); // El controlador devuelve 200 en éxito de validación

        expect(response.body).toHaveProperty('acknowledged', true);
        expect(response.body).not.toHaveProperty('message', 'EMAIL_ALREADY_VERIFIED');

        const userInDb = await UsersModel.findById(validationUserId);
        expect(userInDb.status).toBe(true);
        expect(userInDb.codigo).toBeUndefined();
    });

    it('should return "EMAIL_ALREADY_VERIFIED" if trying to verify an already verified email (200)', async () => {
        await api // Primera verificación
            .put('/api/user/validation')
            .set('Authorization', `Bearer ${validationUserToken}`)
            .send({ code: correctVerificationCode });
        const response = await api // Segundo intento
            .put('/api/user/validation')
            .set('Authorization', `Bearer ${validationUserToken}`)
            .send({ code: correctVerificationCode })
            .expect(200);
        expect(response.body).toHaveProperty('acknowledged', true);
        expect(response.body).toHaveProperty('message', 'EMAIL_ALREADY_VERIFIED');
    });

    it('should fail with incorrect verification code (422)', async () => {
        const response = await api
            .put('/api/user/validation')
            .set('Authorization', `Bearer ${validationUserToken}`)
            .send({ code: "000000" })
            .expect(422);
        expect(response.body).toHaveProperty('message', 'INVALID_VERIFICATION_CODE');
    });

    it('should fail without Authorization token (401)', async () => {
        await api
            .put('/api/user/validation')
            .send({ code: correctVerificationCode })
            .expect(401);
    });

    it('should fail with an invalid/malformed Authorization token (401)', async () => {
        await api
            .put('/api/user/validation')
            .set('Authorization', 'Bearer invalidtoken123')
            .send({ code: correctVerificationCode })
            .expect(401);
    });

    it('should fail if user for token does not exist (404)', async () => {
        const nonExistentUserIdToken = tokenSign({ _id: new mongoose.Types.ObjectId(), role: 'user' });
        await api
            .put('/api/user/validation')
            .set('Authorization', `Bearer ${nonExistentUserIdToken}`)
            .send({ code: '123456' })
            .expect(404);
    });

});


describe('PUT /api/user/personal', () => {
    // Este beforeEach resetea los datos personales del usuario principal ANTES de cada test de este bloque.
    // generalTestUserId y generalTestToken ya están definidos por el beforeAll global.
    beforeEach(async () => {
        if (!generalTestUserId) {
            throw new Error("generalTestUserId no está definido. Error en setup de beforeAll.");
        }
        await UsersModel.findByIdAndUpdate(generalTestUserId, {
            nombre: generalUserInitialData.nombre,
            apellidos: generalUserInitialData.apellidos,
            nif: generalUserInitialData.nif,
            // No resetear email, password, status, role aquí
        });
        // console.log(`Datos personales de ${generalTestUserId} reseteados a iniciales para test de /personal.`);
    });

    it('should update user personal data successfully (200)', async () => {
        if (!generalTestToken) throw new Error("generalTestToken no definido para test /personal.");
        const response = await api
            .put('/api/user/personal')
            .set('Authorization', `Bearer ${generalTestToken}`)
            .send(personalDataToUpdate)
            .expect(200);

        expect(response.body._id).toBe(generalTestUserId.toString());
        expect(response.body.email).toBe(generalUserInitialEmail); // Email no debería cambiar
        expect(response.body.name).toBe(personalDataToUpdate.nombre); // Controlador devuelve 'name'
        expect(response.body.surnames).toBe(personalDataToUpdate.apellidos); // Controlador devuelve 'surnames'
        expect(response.body.nif).toBe(personalDataToUpdate.nif);

        const userInDb = await UsersModel.findById(generalTestUserId);
        expect(userInDb.nombre).toBe(personalDataToUpdate.nombre);
        expect(userInDb.apellidos).toBe(personalDataToUpdate.apellidos);
        expect(userInDb.nif).toBe(personalDataToUpdate.nif);
    });

    it('should fail to update personal data without Authorization token (401)', async () => {
        await api
            .put('/api/user/personal')
            .send(personalDataToUpdate)
            .expect(401);
    });

    it('should fail to update personal data with an invalid NIF (422)', async () => {
        if (!generalTestToken) throw new Error("generalTestToken no definido.");
        const response = await api
            .put('/api/user/personal')
            .set('Authorization', `Bearer ${generalTestToken}`)
            .send(invalidPersonalDataNif)
            .expect(403);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors.some(e => e.path === 'nif')).toBe(true);
    });

    it('should fail to update personal data if required fields are missing (422)', async () => {
        if (!generalTestToken) throw new Error("generalTestToken no definido.");
        const response = await api
            .put('/api/user/personal')
            .set('Authorization', `Bearer ${generalTestToken}`)
            .send(missingPersonalData) // 'nombre' falta
            .expect(403);
        expect(response.body).toHaveProperty('errors');
        // El validador espera 'nombre', 'apellidos', 'nif'
        // Si tu validador se cambió a 'name'/'surnames', ajusta esto:
        expect(response.body.errors.some(e => e.path === 'nombre')).toBe(true);
    });

    it('should fail to update personal data if user for token does not exist (404)', async () => {
        const nonExistentUserIdToken = tokenSign({ _id: new mongoose.Types.ObjectId(), role: 'user' });
        await api
            .put('/api/user/personal')
            .set('Authorization', `Bearer ${nonExistentUserIdToken}`)
            .send(personalDataToUpdate)
            .expect(404); // El authMiddleware o controlador debe manejar esto
    });
});




describe('PATCH /api/user/company', () => {
  

  beforeEach(async () => {
      if (!generalTestUserId) throw new Error("generalTestUserId no definido para tests de /company.");
      await UsersModel.findByIdAndUpdate(generalTestUserId, { $set: { company: null, role: 'user' } }); // Reset a rol 'user' y sin compañía
      console.log(`Datos de compañía para ${generalTestUserId} reseteados.`);
  });

  it('should update company data for a regular user successfully (200)', async () => {
      if (!generalTestToken) throw new Error("generalTestToken no definido.");
      const response = await api
          .patch('/api/user/company')
          .set('Authorization', `Bearer ${generalTestToken}`)
          .send({ company: companyDataToUpdate }) 
          .expect(200);

      expect(response.body).toHaveProperty('acknowledged', true);

      const userInDb = await UsersModel.findById(generalTestUserId);
      expect(userInDb.company).toBeDefined();
      expect(userInDb.company.nombre).toBe(companyDataToUpdate.nombre);
      expect(userInDb.company.cif).toBe(companyDataToUpdate.cif);
      expect(userInDb.company.city).toBe(companyDataToUpdate.city);
  });

  it('should use personal data for an "autonomo" user (200)', async () => {
      if (!generalTestToken) throw new Error("generalTestToken no definido.");
      await UsersModel.findByIdAndUpdate(generalTestUserId, {
          role: 'autonomo',
          nombre: generalUserInitialData.nombre, 
          nif: generalUserInitialData.nif
      });

      const response = await api
          .patch('/api/user/company')
          .set('Authorization', `Bearer ${generalTestToken}`)
          .send({ company: companyDataForAutonomo }) // Enviar solo datos de dirección
          .expect(200);

      expect(response.body).toHaveProperty('acknowledged', true);

      const userInDb = await UsersModel.findById(generalTestUserId);
      expect(userInDb.company).toBeDefined();
      expect(userInDb.company.nombre).toBe(generalUserInitialData.nombre); // Debe tomar el nombre del usuario
      expect(userInDb.company.cif).toBe(generalUserInitialData.nif);       // Debe tomar el NIF del usuario
      expect(userInDb.company.street).toBe(companyDataForAutonomo.street); // La dirección sí se actualiza
  });

  it('should fail to update company data without Authorization token (401)', async () => {
      await api
          .patch('/api/user/company')
          .send({ company: companyDataToUpdate })
          .expect(401);
  });

  it('should fail to update company data with invalid input (e.g., missing company object) (422)', async () => {
      if (!generalTestToken) throw new Error("generalTestToken no definido.");
      const response = await api
          .patch('/api/user/company')
          .set('Authorization', `Bearer ${generalTestToken}`)
          .send({ cif_solo: "EstoNoEsValido" }) // Enviar datos en formato incorrecto
          .expect(403);

      expect(response.body).toHaveProperty('errors');
      // Verificar que el error es por 'company' (el objeto raíz) o un campo específico dentro
      expect(response.body.errors.some(e => e.path === 'company' || e.path.startsWith('company.'))).toBe(true);
  });
});


afterAll(async () => {
  await UsersModel.deleteMany({ email: { $regex: /@example\.com$/ } });
  console.log("Usuarios de prueba finales eliminados.");
  await mongoose.connection.close();
});

