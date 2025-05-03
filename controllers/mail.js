const { sendEmail } = require('../utils/handleMails'); 
const { handleHttpError } = require('../utils/handleError');
const { matchedData } = require('express-validator');

const sendMailCtrl = async (req, res) => {
    try {
        const info = matchedData(req);
        const data = await sendEmail(info);
        res.send({ message: "EMAIL_SENT_SUCCESSFULLY", details: data });
    } catch (err) {
        console.error("ERROR_SEND_EMAIL controller:", err);
        handleHttpError(res, 'ERROR_SEND_EMAIL', 500);
    }
};

module.exports = { send: sendMailCtrl };