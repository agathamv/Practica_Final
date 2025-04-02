const { handleHttpError } = require("../utils/handleError.js");

const customHeader = (req, res, next) => {
    try{
        const apiKey = req.headers.api_key;
        if(apiKey === 'Api-123'){
            next();
        }else{  
            res.status(403).send({error: 'api key no correcta'});
        }
    }catch(err){
        console.error("Error en getItems:", err);
        handleHttpError(res, "ERROR_HEADER", 403);
    }
}
module.exports = customHeader;
