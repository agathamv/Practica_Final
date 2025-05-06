const swaggerJsdoc = require("swagger-jsdoc")

const options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Tracks - Express API with Swagger (OpenAPI 3.0)",
            version: "0.1.0",
            description:
            "This is a CRUD API application made with Express and documented with Swagger",
            
            contact: {
                name: "u-tad",
                url: "https://u-tad.com",
                email: "agatha.martin@u-tad.com",
            },
        },
        servers: [
            { 
                url: "http://localhost:4000",
            },
        ],
        components: {
            
            securitySchemes: {
                bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                }
            },
            schemas: {
                User: { 
                    type: 'object',
                    properties: {
                      _id: { type: 'string', format: 'ObjectId', readOnly: true, example: '668a1b...' },
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string', format: 'password', minLength: 8, example: 'Password123' },
                      role: { type: 'string', enum: ['user', 'admin', 'autonomo', 'invitado'] },
                      status: { type: 'boolean', description: 'Email verification status' },
                      nombre: { type: 'string', nullable: true },
                      apellidos: { type: 'string', nullable: true },
                      nif: { type: 'string', nullable: true },
                      company: { $ref: '#/components/schemas/Company', nullable: true }, 
                      logo: { type: 'string', format: 'url', nullable: true },
                      createdAt: { type: 'string', format: 'date-time', readOnly: true },
                      updatedAt: { type: 'string', format: 'date-time', readOnly: true }
                    }
                },
                UserInputRequired: { 
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'newuser@example.com' },
                    password: { type: 'string', format: 'password', minLength: 8, example: 'Password123' }
                  }
                },
                UserLogin: {
                   type: 'object',
                   required: ['email', 'password'],
                   properties: {
                     email: { type: 'string', format: 'email', example: 'user@example.com' },
                     password: { type: 'string', format: 'password', example: 'Password123' }
                   }
                },
                UserPersonalInput: { 
                  type: 'object',
                  required: ['name', 'surnames', 'nif'],
                  properties: {
                    name: { type: 'string', example: 'Juan' },
                    surnames: { type: 'string', example: 'Pérez García' },
                    nif: { type: 'string', pattern: '^\\d{8}[A-Z]$', example: '12345678Z' }
                  }
                },
                UserResponse: { 
                  type: 'object',
                  properties: {
                    _id: { type: 'string', format: 'ObjectId', readOnly: true, example: '668a1b...' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['user', 'admin', 'autonomo', 'invitado'] },
                    status: { type: 'boolean', description: 'Email verification status' },
                    nombre: { type: 'string', nullable: true },
                    apellidos: { type: 'string', nullable: true },
                    nif: { type: 'string', nullable: true },
                    company: { $ref: '#/components/schemas/Company', nullable: true }, 
                    logo: { type: 'string', format: 'url', nullable: true },
                    createdAt: { type: 'string', format: 'date-time', readOnly: true },
                    updatedAt: { type: 'string', format: 'date-time', readOnly: true }
                  }
                },
                 LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', description: 'JWT Bearer Token' },
                        user: { $ref: '#/components/schemas/UserResponse' }
                    }
                },
                Company: { 
                  type: 'object',
                  properties: {
                    nombre: { type: 'string', nullable: true },
                    cif: { type: 'string', nullable: true },
                    street: { type: 'string', nullable: true },
                    number: { type: 'string', nullable: true },
                    postal: { type: 'string', nullable: true },
                    city: { type: 'string', nullable: true },
                    province: { type: 'string', nullable: true }
                  }
                },
                CompanyInput: { 
                  type: 'object',
                  properties: {
                    nombre: { type: 'string', example: 'Mi Empresa SL' },
                    cif: { type: 'string', example: 'B12345678' },
                    street: { type: 'string', example: 'Calle Falsa' },
                    number: { type: 'string', example: '123' },
                    postal: { type: 'string', example: '28080' },
                    city: { type: 'string', example: 'Madrid' },
                    province: { type: 'string', example: 'Madrid' }
                  }
                },
                Address: { 
                   type: 'object',
                   properties: {
                     street: { type: 'string', nullable: true },
                     number: { type: 'string', nullable: true },
                     postal: { type: 'string', nullable: true },
                     city: { type: 'string', nullable: true },
                     province: { type: 'string', nullable: true }
                   }
                },
        
                
                ClientInput: {
                    type: 'object',
                    required: ['name', 'cif'],
                    properties: {
                        name: { type: 'string', example: 'Cliente Importante SA' },
                        cif: { type: 'string', example: 'A87654321' },
                        address: { $ref: '#/components/schemas/Address', nullable: true }
                    }
                },
                Client: { 
                    allOf: [ 
                        { $ref: '#/components/schemas/ClientInput' }
                    ],
                    type: 'object',
                    properties: {
                        _id: { type: 'string', format: 'ObjectId', readOnly: true },
                        userId: { type: 'string', format: 'ObjectId', readOnly: true },
                        createdAt: { type: 'string', format: 'date-time', readOnly: true },
                        updatedAt: { type: 'string', format: 'date-time', readOnly: true },
                        deleted: { type: 'boolean', readOnly: true, nullable: true }, 
                        deletedAt: { type: 'string', format: 'date-time', readOnly: true, nullable: true } 
                    }
                },
        
                ProjectInput: {
                    type: 'object',
                    required: ['name', 'clientId'],
                    properties: {
                        name: { type: 'string', example: 'Proyecto Construcción Nave' },
                        clientId: { type: 'string', format: 'ObjectId', description: 'ID del Cliente asociado' },
                        projectCode: { type: 'string', example: 'PROJ-001', nullable: true },
                        code: { type: 'string', example: 'INT-PROJ-001', nullable: true },
                        address: { $ref: '#/components/schemas/Address', nullable: true },
                        begin: { type: 'string', format: 'date', example: '2025-01-15', nullable: true },
                        end: { type: 'string', format: 'date', example: '2025-12-15', nullable: true },
                        notes: { type: 'string', example: 'Notas iniciales del proyecto.', nullable: true },
                    }
                },
                Project: { 
                    allOf: [
                        { $ref: '#/components/schemas/ProjectInput' }
                    ],
                    type: 'object',
                    properties: {
                        _id: { type: 'string', format: 'ObjectId', readOnly: true },
                        userId: { type: 'string', format: 'ObjectId', readOnly: true },
                        createdAt: { type: 'string', format: 'date-time', readOnly: true },
                        updatedAt: { type: 'string', format: 'date-time', readOnly: true },
                        deleted: { type: 'boolean', readOnly: true, nullable: true },
                        deletedAt: { type: 'string', format: 'date-time', readOnly: true, nullable: true }
                    }
                },
        
                
                DeliveryNoteInput: { 
                     type: 'object',
                     required: ['clientId', 'projectId', 'format', 'workdate', 'description'],
                     properties: {
                         clientId: { type: 'string', format: 'ObjectId' },
                         projectId: { type: 'string', format: 'ObjectId' },
                         format: { type: 'string', enum: ['hours', 'material'] },
                         hours: { type: 'number', format: 'float', minimum: 0.1, nullable: true, description: 'Required if format=hours' },
                         quantity: { type: 'number', format: 'float', minimum: 0, nullable: true, description: 'Required if format=material' },
                         description: { type: 'string', description: 'Main description or material name' },
                         workdate: { type: 'string', format: 'date-time', example: '2025-05-10T10:00:00Z' },
                         
                     }
                },
                DeliveryNote: { 
                    type: 'object',
                    properties: {
                         _id: { type: 'string', format: 'ObjectId', readOnly: true },
                         userId: { type: 'string', format: 'ObjectId', readOnly: true },
                         clientId: { type: 'string', format: 'ObjectId' }, 
                         projectId: { type: 'string', format: 'ObjectId' }, 
                         format: { type: 'string', enum: ['hours', 'material', 'any', 'multi'] }, 
                         hours: { type: 'number', nullable: true },
                         quantity: { type: 'number', nullable: true },
                         description: { type: 'string', nullable: true },
                         descriptionId: { type: 'string', format: 'ObjectId', nullable: true },
                         items: { 
                            type: 'array',
                            items: { $ref: '#/components/schemas/DeliveryNoteItem' }
                         },
                         workdate: { type: 'string', format: 'date-time' },
                         pending: { type: 'boolean' },
                         sign: { type: 'string', format: 'url', nullable: true, description: 'URL to signature image (IPFS)'},
                         photo: { type: 'string', format: 'url', nullable: true, description: 'URL to photo image (IPFS)'},
                         pdf: { type: 'string', format: 'url', nullable: true, description: 'URL to generated PDF (IPFS)'},
                         isSigned: { type: 'boolean' },
                         observerName: { type: 'string', nullable: true },
                         observerNif: { type: 'string', nullable: true },
                         observations: { type: 'string', nullable: true },
                         createdAt: { type: 'string', format: 'date-time', readOnly: true },
                         updatedAt: { type: 'string', format: 'date-time', readOnly: true },
                         deleted: { type: 'boolean', readOnly: true, nullable: true },
                         deletedAt: { type: 'string', format: 'date-time', readOnly: true, nullable: true }
                    }
                },
                DeliveryNoteItem: { 
                     type: 'object',
                     properties: {
                        _id: { type: 'string', format: 'ObjectId', readOnly: true },
                         description: { type: 'string' },
                         quantity: { type: 'number', nullable: true },
                         hours: { type: 'number', nullable: true },
                         
                     }
                },
                SignInput: { 
                    type: 'object',
                    required: ['sign'],
                    properties: {
                        sign: { type: 'string', format: 'byte', description: 'Base64 encoded Data URL of the signature image (e.g., data:image/png;base64,...)' }
                    }
                },
        
                
                AckResponse: {
                     type: 'object',
                     properties: {
                         acknowledged: { type: 'boolean', example: true }
                     }
                },
                StatusResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'OK' },
                        message: { type: 'string', example: 'Operation successful' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'Error description', example: 'RESOURCE_NOT_FOUND' },
                        
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', example: 'field'},
                                    msg: { type: 'string', example: 'Invalid value'},
                                    path: { type: 'string', example: 'email'},
                                    location: { type: 'string', example: 'body'}
                                }
                            },
                            nullable: true
                        }
                    }
                }
        
            }
        },
        
        
    },
    apis: ["./routes/*.js"],
};

module.exports = swaggerJsdoc(options)