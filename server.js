const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex');


const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'erikken',
    database : 'gametop'
  }
});

// knex return promise, so we using .then 
const app = express();

app.use(express.json());
app.use(cors());


app.post('/signin', (req,res)=> {
	db.select('email', 'hash').from('login')
		.where('email', '=', req.body.email)
		.then(loginInfo => {
			const isValid = bcrypt.compareSync(req.body.password, loginInfo[0].hash);
			if (isValid) {
				return db.select('*').from('users')
					.where('email', '=', req.body.email)
					.then(user => {
						res.json(user[0])
					})
					.catch(err => res.staus(400).json('unable to get user'))
			} else {
					res.status(400).json('0');
			}
		})
		.catch(err => res.status(400).json('0'))
})

app.post('/register', (req,res) => {
	const { email, name, password } = req.body;
	const hash = bcrypt.hashSync(password, 10);
		db.transaction(trx => {
			trx.insert({
				hash: hash,
				email: email
			})
			.into('login')
			.returning('email')
			.then(email => {
				trx.insert({
					name:name,
					email: email[0]
				})
				.into('maps')
				.returning('email')
				.then(loginEmail => {
					return trx('users')
						.returning('*')
						.insert({
							email: loginEmail[0],
							name: name,
							joined: new Date()
						})
						.then(user => {
							res.json(user[0]);
						})
				})
				.then(trx.commit)
				.catch(trx.rollback)
			})
			.catch(err => {
				res.status(400).json('unable to register')
			})
		})
		.catch(err => {
			res.status(400).json('unable to register')
		})
})

app.get('/profile/:id', (req,res) => {
	const { id } = req.params;
	db.select('*').from('users').where({id})
		.then(user => {
		if (user.length) {
			res.json(user[0]);
		} else {
			res.status(400).json('User Not Found');
		}
	})
	.catch(err => res.status(400).json('error getting user'))
})

app.put('/score', (req,res) => {
	const { id } = req.body;
	db('users').where('id', '=', id)
		.increment('score', 1)
		.returning('score')
		.then(score => {
			res.json(score[0]);
		})
		.catch(err => res.status(400).json('unable to get entries'))
})

app.put('/mapupload', (req,res) => {
	const {email, map, name} = req.body;
	db.select('*').from("maps").where('email', '=', email)
	.update({
		map: db.raw(`map || ?::jsonb`, JSON.stringify(map))
	})
	.returning('map')
	.then(data => {
		res.status(200).json(data[0])
	})
	.catch(err => res.status(400).json('Unable to upload the map'))
})

app.post('/loadmap', (req, res) => {
	const { email } = req.body
	db.select('map').from('maps').where('email', '=', email)
	.then(map => {
		res.json(map[0]);
	})
	.catch(err => res.status(400).json('Unable to load the map'))
})


app.listen(3000, ()=> {
	console.log('Server 3000 is running.....');
})

