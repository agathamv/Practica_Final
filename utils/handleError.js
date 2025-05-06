const handleHttpError = (res, message, code =403) => {
    res.status(code).send({message: message});
};

module.exports = {handleHttpError};

