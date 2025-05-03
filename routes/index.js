const express = require("express");
const fs = require("fs");
const path = require("path"); 
const router = express.Router();

const removeExtension = (fileName) => {
    return path.parse(fileName).name; 
};

const currentDir = __dirname; 

fs.readdirSync(currentDir).forEach((file) => {
    const filePath = path.join(currentDir, file);
    if (fs.statSync(filePath).isFile() && file.endsWith('.js')) { 
        const name = removeExtension(file);
        if (name !== 'index') { 
            console.log(`LOADING ROUTE: /${name}`);
            try {
                router.use(`/${name}`, require(`./${file}`)); 
            } catch (error) {
                console.error(`Failed to load route ${name}:`, error);
            }
        }
    }
});

module.exports = router; // Export the configured router