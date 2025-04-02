const {validationResult} = require('express-validator');

const handleValidator = (req, res, next) => {
    try{
        validationResult(req).throw();
        next();

    }catch(err){
        console.log(err);
        res.status(403);
        res.send({errors: err.array()});
    }
}
module.exports = handleValidator;

