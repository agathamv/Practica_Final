const express = require("express")
const { matchedData } = require("express-validator")
const { encrypt } = require("../utils/handlePassword")
const {usersModel} = require("../models")
const router = express.Router()
const {validatorRegister, validatorLogin, validatorPersonalData, validatorCompany} = require("../validators/auth")
const { registerCtrl, loginCtrl, PersonalDataCtrl, companyCtrl} = require("../controllers/auth")
const { tokenSign } = require("../utils/handleJwt")


router.post("/register", validatorRegister, registerCtrl, async (req, res) => {
    req = matchedData(req)
    const password = await encrypt(req.password)
    const body = {...req, password} // Con "..." duplicamos el objeto y le añadimos o sobreescribimos una propiedad
    const dataUser = await usersModel.create(body)
    dataUser.set('password', undefined, { strict: false })
    const data = {
        token: await tokenSign(dataUser),
        user: dataUser
    }
    res.send(data)
})

router.post("/login", validatorLogin, loginCtrl,async (req, res) => {
    req = matchedData(req)
    const user = await usersModel.findOne({ email: req.email })
    if (!user) {
        return res.status(404).send({ error: "User not found" })
    }

    const isPasswordValid = await compare(req.password, user.password)

    if (!isPasswordValid) {
        return res.status(401).send({ error: "Invalid password" })
    }
    const data = {
        token: await tokenSign(user),
        user
    }
    res.send(data)
})

router.put("/personaldata", validatorPersonalData, PersonalDataCtrl);

router.put("/company", validatorCompany, companyCtrl);

module.exports = router