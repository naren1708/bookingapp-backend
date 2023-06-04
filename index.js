
const express = require ('express')
const cors = require('cors');
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const userData = require('./models/User.js')
const User = require('./models/User.js');
const Place = require('./models/Place.js')
const Booking = require('./models/Booking.js')
const cookieParser = require('cookie-parser')
const imageDownloader = require('image-downloader')
const multer = require('multer')
const fs = require('fs')


require('dotenv').config();

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'sdgfgjfgjfgjfgsfdgdfgsdfgsdg'

// l44206Q26QOilcBv
app.use(express.json())
app.use(cookieParser())

// to change
// app.use('/uploads', express.static(__dirname + '/uploads'))

app.use(cors({
    credentials: true,
    origin: ['http://localhost:3000','https://bookify-naren.netlify.app'],
}));

// just checking

// console.log(process.env.MONGO_URL)
// mongoose connecting to our database
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log('db connected')
    }).catch(e => {
        console.log('err', e);
    })


function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            resolve(userData);
        });
    });
}



app.get('/test', (req, res) => {
    res.json('test ok');
})

// End point for register
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userDataDoc = await userData.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt)
        });
        res.json(userDataDoc)
    } catch (e) {
        res.status(422).json(e);
    }
})

// End point for login app
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userDataDoc = await userData.findOne({ email })
    if (userDataDoc) {
        const passOk = bcrypt.compareSync(password, userDataDoc.password)
        if (passOk) {
            jwt.sign({
                email: userDataDoc.email,
                id: userDataDoc._id
            }, jwtSecret, {}, (err, token) => {
                if (err) {
                    throw err;
                }
                res.cookie('token', token,{
                    sameSite:'none',
                    secure:true
                }).json(userDataDoc)
            })
            // res.json('pass ok')
        } else {
            res.status(422).json('pass not ok')
        }
    } else {
        res.json('not found')
    }
})


app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    // res.json({token})
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) {
                throw err;
            }
            const { name, email, _id } = await User.findById(userData.id)
            res.json({ name, email, _id });
        });
    } else {
        res.json(null)
    }
})


app.post('/logout', (req, res) => {
    res.cookie('token', '').json(true);
});

// to change
// api end point for uploading photos from link
// app.post('/upload-by-link', async (req, res) => {
//     const { link } = req.body;
//     const newName = 'photo' + Date.now() + '.jpg';
//     await imageDownloader.image({
//         url: link,
//         dest: __dirname + '/Uploads/' + newName,
//     })
//     res.json(newName)
// })

// to change
// api for uploading photos from local
// const photosMiddleware = multer({ dest: 'uploads/' })
// app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
//     const uploadedFiles = [];
//     for (let i = 0; i < req.files.length; i++) {
//         const { path, originalname } = req.files[i];
//         const parts = originalname.split('.')
//         const ext = parts[parts.length - 1]
//         const newPath = path + '.' + ext;
//         fs.renameSync(path, newPath)
//         uploadedFiles.push(newPath.replace('uploads/', ''));
//     }
//     res.json(uploadedFiles);
// });


app.post('/places', (req, res) => {
    const { token } = req.cookies;
    const {
        title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price,
    } = req.body;

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) {
            throw err;
        }
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address, photos: addedPhotos, description,
            perks, extraInfo, checkIn, checkOut, maxGuests, price,
        });
        res.json(placeDoc);
    });
})


app.get('/user-places',  (req, res) => {
    const { token } = req.cookies;
    console.log('from user-places',token)
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if(err) res.status(400).json({message:err})
        const { id } = userData;
        res.json(await Place.find({ owner: id }));
    });
});


app.get('/places/:id', async (req, res) => {
    const { id } = req.params;
    res.json(await Place.findById(id))
});

app.put('/places', async (req, res) => {
    const { token } = req.cookies;
    const {
        id, title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price,
    } = req.body;

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.findById(id)
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title, address, photos: addedPhotos, description,
                perks, extraInfo, checkIn, checkOut, maxGuests, price,
            });
            await placeDoc.save();
            res.json('ok');
        }
    })
});


// getting some places for the home page
app.get('/places', async (req, res) => {
    res.json(await Place.find());
});

app.post('/bookings', async (req, res) => {
    const userData = await getUserDataFromReq(req);
    const {
        place, checkIn, checkOut, numberOfGuests, name, phone, price,
    } = req.body;
    Booking.create({
        place, checkIn, checkOut, numberOfGuests, name, phone, price,
        user:userData.id,
    }).then((doc) => {
        res.json(doc);
    }).catch((err) => {
        throw err;
    })
});


app.get('/bookings', async (req, res) => {
    const userData = await getUserDataFromReq(req);
    res.json( await Booking.find({user:userData.id}).populate('place') )
})

const port=process.env.PORT || 4000

app.listen(port,"0.0.0.0", () => {
    console.log('started');
});
