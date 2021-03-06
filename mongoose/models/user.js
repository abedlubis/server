const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getFormattedDate } = require('../../helpers/date')

const JWT_SECRET=process.env.JWT_SECRET
var emailRegex = new RegExp("^.+@[^\.].*\.[a-z]{2,}$")
const dataSchema = new mongoose.Schema({
  value: Number,
  createdAt: String
})

const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  height: Number,
  target: {
    weight: Number,
    date: {
      type: String,
      validate: {
        validator: val => {
          return new Date(val) > new Date(getFormattedDate(6)) 
        }
      }
    }
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: val => emailRegex.test(val)
    }
  },
  password: {
    type: String,
    required: true,
    minLength: 5
  },
  gender: {
    type: String,
    validate: {
      validator: (val) => {
        let allowed = ['male', 'female']
        return allowed.includes(val.toLowerCase().trim())
      }
    }
  },
  data: {
    type: [dataSchema],
    default: []
  },
  timbangans: {
    type: [ Number ],
    default: []
  }
})

//HASH USER PASSWORD ON CREATE NEW USER
userSchema.pre('save', function (next) {
  let self = this
  if (!this.isModified('password')) return next()
  bcrypt.genSalt(12, function (err, salt) {
    if (err) return next(err)
    // hash the password along with our new salt
    bcrypt.hash(self.password, salt, function (err, hash) {
      if (err) return next(err)
      self.password = hash
      next()
    })
  })
})

//DELETE NON UNIQUE TIMBANGAN IDs
userSchema.post('findOneAndUpdate', function (doc) {
  var isUnique = (val, index, self) => {
    return self.indexOf(val) === index 
  }
  let timbangans = doc.timbangans
  let uniqueIds = timbangans.filter(isUnique)
  doc.timbangans = uniqueIds
  doc.save()
})

//CHECK USER PASSWORD ON SIGN IN 
userSchema.methods.checkPassword = async function (candidatePwd, userData) {
  let same = await bcrypt.compare(candidatePwd, this.password)
  if (same === false) return new Error('wrong username / password')
  else {
    delete userData.password
    let token = this.createToken(userData)
    return token
  }
}
//create jwt token
userSchema.methods.createToken = (data) => jwt.sign(data.toObject(), JWT_SECRET)

const userModel = mongoose.model('User', userSchema)
module.exports = userModel