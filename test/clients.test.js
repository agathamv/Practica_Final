const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); 
const UsersModel = require('../models/users'); 
const ClientsModel = require('../models/client'); 

const api = request(app);


const testUserEmail = `client-owner-${Date.now()}@example.com`;
const testUserPassword = 'ClientOwnerPassword123';
let testUserToken;
let testUserId;

const clientData1 = {
    name: "Tech Solutions Inc.",
    cif: "B87654321",
    address: {
        street: "Main Street", number: "100", postal: "28001",
        city: "Madrid", province: "Madrid"
    }
};
const clientData2 = {
    name: "Innovate Systems",
    cif: "A11223344", 
    address: {
        street: "Innovation Parkway", number: "1", postal: "08001",
        city: "Barcelona", province: "Barcelona"
    }
};
const clientUpdateData = {
    name: "Tech Solutions Inc. (Updated Name)",
    address: {
        street: "Main Street Updated", number: "101-B", postal: "28002",
        city: "Madrid Norte", province: "Madrid"
    }
};


beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    await UsersModel.deleteMany({ email: { $regex: /@example\.com$/ } });
    await ClientsModel.deleteMany({}); 
    console.log("Usuarios y Clientes de prueba previos eliminados.");

    
    const registerRes = await api.post('/api/user/register').send({ email: testUserEmail, password: testUserPassword });
    if (registerRes.status !== 201) throw new Error("Fallo registro usuario para tests de cliente en beforeAll");
    testUserId = registerRes.body.user._id.toString();
    let tempToken = registerRes.body.token;

    const userDb = await UsersModel.findById(testUserId).select('+codigo');
    if (!userDb || !userDb.codigo) throw new Error("No se encontró código de verificación para usuario de cliente");

    await api.put('/api/user/validation').set('Authorization', `Bearer ${tempToken}`).send({ code: userDb.codigo });

    const loginRes = await api.post('/api/user/login').send({ email: testUserEmail, password: testUserPassword });
    if (loginRes.status !== 200) throw new Error("Fallo login usuario verificado para tests de cliente en beforeAll");
    testUserToken = loginRes.body.token;

    console.log(`Usuario ${testUserEmail} preparado para tests de Clientes.`);
});

afterAll(async () => {
    await UsersModel.deleteMany({ email: { $regex: /@example\.com$/ } });
    await ClientsModel.deleteMany({});
    console.log("Usuarios y Clientes de prueba finales eliminados.");
    await mongoose.connection.close();
});


describe('Client Endpoints (/api/client)', () => {
    let createdClientId1;
    let createdClientId2;

    
    describe('POST /api/client', () => {
        it('should create a new client successfully (201)', async () => {
            const response = await api
                .post('/api/client')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(clientData1)
                .expect(201)
                .expect('Content-Type', /application\/json/);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toBe(clientData1.name);
            expect(response.body.cif).toBe(clientData1.cif);
            expect(response.body.userId).toBe(testUserId);
            expect(response.body.address.city).toBe(clientData1.address.city);
            createdClientId1 = response.body._id.toString(); 
        });

        it('should create a second client with a different CIF successfully (201)', async () => {
            const response = await api
                .post('/api/client')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(clientData2)
                .expect(201);

            expect(response.body.name).toBe(clientData2.name);
            expect(response.body.cif).toBe(clientData2.cif);
            createdClientId2 = response.body._id.toString(); 
        });

        it('should fail to create a client with a duplicate CIF for the same user (409)', async () => {
            const duplicateData = { ...clientData1, name: "Duplicate Name Attempt" };
            await api
                .post('/api/client')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(duplicateData)
                .expect(409);
        });

        it('should fail to create a client with missing required fields', async () => {
            const invalidData = { ...clientData1 };
            delete invalidData.name; 
            await api
                .post('/api/client')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(invalidData)
                .expect(403);
        });

        it('should fail to create a client without an Authorization token (401)', async () => {
            await api
                .post('/api/client')
                .send(clientData1)
                .expect(401);
        });
    });

    
    describe('GET /api/client', () => {
        it('should get all active clients for the authenticated user (200)', async () => {
            
            expect(createdClientId1).toBeDefined();
            expect(createdClientId2).toBeDefined();

            const response = await api
                .get('/api/client')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2); // Al menos los 2 creados
            expect(response.body.some(c => c._id === createdClientId1 && c.name === clientData1.name)).toBe(true);
            expect(response.body.some(c => c._id === createdClientId2 && c.name === clientData2.name)).toBe(true);
        });
    });

    
    describe('GET /api/client/:id', () => {
        it('should get a specific client by its ID (200)', async () => {
            expect(createdClientId1).toBeDefined();
            const response = await api
                .get(`/api/client/${createdClientId1}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);

            expect(response.body._id).toBe(createdClientId1);
            expect(response.body.name).toBe(clientData1.name);
            expect(response.body.cif).toBe(clientData1.cif);
        });

        it('should fail to get a client with an invalid ID format (422)', async () => {
            await api
                .get('/api/client/invalidObjectId')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(403);
        });

        it('should fail to get a non-existent client (404)', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            await api
                .get(`/api/client/${nonExistentId}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(404);
        });

        it('should fail to get a client belonging to another user (404)', async () => {
            
            const otherUserRes = await api.post('/api/user/register').send({ email: `other-owner-${Date.now()}@example.com`, password: 'p' });
            const otherToken = otherUserRes.body.token;
            const otherClientRes = await api.post('/api/client').set('Authorization', `Bearer ${otherToken}`).send({ name: "Other's Client", cif: "C99999999" });

            await api 
                .get(`/api/client/${otherClientRes.body._id}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(403); 
        });
    });

    describe('PUT /api/client/:id', () => {
        it('should update an existing client successfully (200)', async () => {
            expect(createdClientId1).toBeDefined();
            const response = await api
                .put(`/api/client/${createdClientId1}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(clientUpdateData)
                .expect(200);

            expect(response.body.name).toBe(clientUpdateData.name);
            expect(response.body.address.number).toBe(clientUpdateData.address.number);
            expect(response.body.address.city).toBe(clientUpdateData.address.city);
        });

        it('should fail to update if new CIF conflicts with another client of the same user (409)', async () => {
            expect(createdClientId1).toBeDefined();
            expect(createdClientId2).toBeDefined(); 
            const conflictingUpdate = { cif: clientData2.cif }; 
            await api
                .put(`/api/client/${createdClientId1}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(conflictingUpdate)
                .expect(409);
        });
        
    });

    
    describe('Client Archiving, Restoring, and Deletion', () => {
        let clientToManageId;

        beforeEach(async () => { 
            const clientPayload = { name: `ManageMe-${Date.now()}`, cif: `M${Date.now().toString().slice(-8)}` };
            const res = await api.post('/api/client').set('Authorization', `Bearer ${testUserToken}`).send(clientPayload);
            clientToManageId = res.body._id.toString();
        });

        it('DELETE /api/client/:id should soft delete a client (200)', async () => {
            const response = await api
                .delete(`/api/client/${clientToManageId}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('message', 'CLIENT_ARCHIVED_SOFT_DELETE');

            const clientInDb = await ClientsModel.findOneDeleted({ _id: clientToManageId });
            expect(clientInDb).not.toBeNull();
            if(clientInDb) expect(clientInDb.deleted).toBe(true);
        });

        it('GET /api/client/archived should list soft-deleted clients (200)', async () => {
            
            await api.delete(`/api/client/${clientToManageId}`).set('Authorization', `Bearer ${testUserToken}`);

            const response = await api
                .get('/api/client/archived')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some(c => c._id === clientToManageId)).toBe(true);
        });

        
        it('PATCH /api/client/:id/restore should restore an archived client (200)', async () => {
            
            await api.delete(`/api/client/${clientToManageId}`).set('Authorization', `Bearer ${testUserToken}`);
            
            const response = await api
                .patch(`/api/client/${clientToManageId}/restore`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('message', 'CLIENT_RESTORED_SUCCESSFULLY');
            expect(response.body.client._id).toBe(clientToManageId);
            expect(response.body.client.deleted).toBe(false); // El cliente restaurado

            const clientInDb = await ClientsModel.findById(clientToManageId);
            expect(clientInDb).not.toBeNull();
            if(clientInDb) expect(clientInDb.deleted).toBe(false);
        });

        it('DELETE /api/client/:id?hard=true should hard delete a client (200)', async () => {
            const response = await api
                .delete(`/api/client/${clientToManageId}?hard=true`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('message', 'CLIENT_PERMANENTLY_DELETED');

            const clientInDb = await ClientsModel.findById(clientToManageId);
            expect(clientInDb).toBeNull();
            const deletedClient = await ClientsModel.findOneDeleted({ _id: clientToManageId });
            expect(deletedClient).toBeNull(); 
        });
    });

}); 