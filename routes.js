var jwt             = require('jsonwebtoken'),
    shortId         = require('shortid'),
    Models          = require('./app/models'),
    config          = require('./config/database'),
    baseUrl         = require('./config/baseUrl').baseUrl,
    _               = require('lodash');

module.exports = function(app, passport) {

    app.get('/api/data/schema', function(req, res) {
        res.status(200).send(Models.Data.schema);
    });

    // USERS
    app.get('/api/users', function(req, res) {
        Models.User.find({'_id': { '$exists': true }}, function(err, users) {
            if (err) {
                console.log(err);
                return done(err);
            }
            res.status(200).send(users);
        });            
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.status(200).send('User successfully logged out');
    });

    app.post('/login', passport.authenticate('local-login'), function(req, res) {
        token = createToken(req.user); 
        var userBlob = {
            user: req.user,
            id_token: token
        };
        res.status(201).send(userBlob);

    });


    // ASSAYS GET, POST, DELETE
    app.get('/api/assays', function(req, res) {
        // params are blank, id, or centerId
        console.log(req.query);
        var query;
        if (req.query.id) {
            query = { '_id': req.query.id};
        }
        else if (req.query.centerId) {
            query = { 'centerId': req.query.centerId };
        }
        else {
            query = { '_id': { '$exists': true }};
        }
        findQuery = Models.Assay.find(query).lean();
        findQuery.exec(function(err, assays) {
            if (err) {
                console.log(err);
                res.status(404).send(err);
            }
            res.status(200).send(assays);
        });        
    });

    app.post('/api/assays', function(req, res) {
        console.log('Posting To Assays');
        var assayData = req.body;
        assayData._id = shortId.generate();
        var saveData = Models.Assay.create(assayData);
        res.status(201).send(saveData);
    });

    app.delete('/api/assays/remove', function(req, res) {
        Models.Assay.find({ '_id': req.query.id }).remove(function(err, result) {
            if (err) {
                console.log(err);
                res.status(404).send('Could not delete assay with id: ' + req.query.id + ' Error: ' + err);
            }
            res.status(200).send('Assay with id ' + req.query.id + ' deleted.');
        });

    });

    // CELL LINES GET, POST, DELETE
    app.get('/api/cellLines', function(req, res) {
        // params are blank, id, or centerId
        console.log(req.query);
        var query;
        if (req.query.id) {
            query = { '_id': req.query.id};
        }
        else if (req.query.centerId) {
            query = { 'centerId': req.query.centerId };
        }
        else {
            query = { '_id': { '$exists': true }};
        }
        findQuery = Models.CellLine.find(query).lean();
        findQuery.exec(function(err, cellLines) {
            if (err) {
                console.log(err);
                res.status(404).send(err);
            }
            res.status(200).send(cellLines);
        });            
    });

    app.post('/api/cellLines', function(req, res) {
        console.log('Posting To Cell Lines');
        var inputData = req.body;
        inputData._id = shortId.generate();
        var saveData = Models.CellLine.create(inputData);
        res.status(201).send(saveData);
    });

    app.delete('/api/cellLines/remove', function(req, res) {
        Models.CellLine.find({ '_id': req.query.id }).remove(function(err, result) {
            if (err) {
                console.log(err);
                res.status(404).send('Could not delete assay with id: ' + req.query.id + ' Error: ' + err);
            }
            res.status(200).send('Assay with id ' + req.query.id + ' deleted.');
        });

    });

    // PERTURBAGENS GET, POST, DELETE
    app.get('/api/perturbagens', function(req, res) {
        // params are blank, id, or centerId
        console.log(req.query);
        var query;
        if (req.query.id) {
            query = { '_id': req.query.id};
        }
        else if (req.query.centerId) {
            query = { 'centerId': req.query.centerId };
        }
        else {
            query = { '_id': { '$exists': true }};
        }
        findQuery = Models.Perturbagen.find(query).lean();
        findQuery.exec(function(err, perturbagens) {
            if (err) {
                console.log(err);
                res.status(404).send(err);
            }
            res.status(200).send(perturbagens);
        });            
    });

    app.post('/api/perturbagens', function(req, res) {
        console.log('Posting To Perturbagens');
        var inputData = req.body;
        inputData._id = shortId.generate();
        var saveData = Models.Perturbagen.create(inputData);
        res.status(201).send(saveData);
    });

    app.delete('/api/perturbagens/remove', function(req, res) {
        Models.Perturbagen.find({ '_id': req.query.id }).remove(function(err, result) {
            if (err) {
                console.log(err);
                res.status(404).send('Could not delete assay with id: ' + req.query.id + ' Error: ' + err);
            }
            res.status(200).send('Assay with id ' + req.query.id + ' deleted.');
        });

    });

    // READOUTS GET, POST, DELETE
    app.get('/api/readouts', function(req, res) {
        // params are blank, id, or centerId
        console.log(req.query);
        var query;
        if (req.query.id) {
            query = { '_id': req.query.id};
        }
        else if (req.query.centerId) {
            query = { 'centerId': req.query.centerId };
        }
        else {
            query = { '_id': { '$exists': true }};
        }
        findQuery = Models.Readout.find(query).lean();
        findQuery.exec(function(err, readouts) {
            if (err) {
                console.log(err);
                res.status(404).send(err);
            }
            res.status(200).send(readouts);
        });            
    });

    app.post('/api/readouts', function(req, res) {
        console.log('Posting');
        var inputData = req.body;
        inputData._id = shortId.generate();
        var saveData = Models.Readout.create(inputData);
        res.status(201).send(saveData);
    });

    app.delete('/api/readouts/remove', function(req, res) {
        Models.Readout.find({ '_id': req.query.id }).remove(function(err, result) {
            if (err) {
                console.log(err);
                res.status(404).send('Could not delete assay with id: ' + req.query.id + ' Error: ' + err);
            }
            res.status(200).send('Assay with id ' + req.query.id + ' deleted.');
        });

    }); 

    // FORM/DATASET GET, POST, UPDATE, DELETE
    // url is /api/data?userId=ABCD&formId=EFGH
    // TODO: Change to cleaner version used in other GETs with just one Find query
    app.get('/api/data', function(req, res) {
        if (req.query.userId && req.query.formId) {
            Models.Data.find({ _id: req.query.formId, userId: req.query.userId }, function(err, userForm) {
                if (err) {
                    console.log(err);
                    res.status(404).send('Form with given formId and userId could not be found.' + ' Error: ' + err);
                }
                res.status(200).send(userForm);
            });
        }
        else if (req.query.userId) {
            Models.Data.find({ userId: req.query.userId }, function(err, userData) {
                if (err) {
                    console.log(err);
                    res.status(404).send('Form with given userId could not be found.' + ' Error: ' + err);
                }
                res.status(200).send(userData);
            });
        }
        else if (req.query.formId) {
            Models.Data.find({ _id: req.query.formId }, function(err, formData) {
                if (err) {
                    console.log(err);
                    res.status(404).send('Form with given userId could not be found.' + ' Error: ' + err);
                }
                res.status(200).send(userData);
            });
        }
        else {
            Models.Data.find({'_id': { '$exists': true }}, function(err, allData) {
                if (err) {
                    console.log(err);
                    res.status(404).send('Forms could not be found.');
                }
                res.status(200).send(allData);
            });
        }
    });

    // TODO: Change after making assay and cell line acronyms
    app.post('/api/data', function(req, res) {
        console.log('Posting To Data');
        var inputData = req.body;
        if (inputData.cellLines.length > 1) {
            inputData._id = 'LINCS-' + inputData.center + '-MTPL-' + shortId.generate();
        } else if (inputData.cellLines.length === 1) {
            inputData._id = 'LINCS-' + inputData.center + '-' + inputData.cellLines[0].name + '-' + shortId.generate();
        } else {    
            inputData._id = 'LINCS-' + inputData.center + '-NONE-' + shortId.generate();
        }

        var form = new Models.Data(inputData);
        form.save(function(err) {
            console.log(err);
        });
        res.status(201).send(form);
    });

    // UPDATE
    app.put('/api/data', function(req, res) {
        console.log(req.query._id);
        Models.Data.update({ _id: req.query._id }, req.body, function(err, result) {
            if (err)
                res.status(404).send('Form with id ' + req.query.id + ' could not be updated');
            // TODO: Check that 200 and 404 are the correct status codes for put
            res.status(200).send(result);
        });
    });

    app.delete('/api/data', function(req, res) {
        if (req.query.userId && req.query.formId) {
            Models.Data.find({ _id: req.query.formId, userId: req.query.userId }).remove(function(err, result) {
                if (err) {
                    console.log(err);
                    res.status(404).send('There was an error deleting the form with id ' + req.query.formId + ' Error: ' + err);
                }
                res.status(200).send('DELETE: userId: ' + req.query.userId + ', formId: ' + req.query.formId);
            });
        }

        else if (!req.query.userId && req.query.formId) {
            Models.Data.find({ _id: req.query.formId }).remove(function(err, result) {
                if (err) {
                    console.log(err);
                    res.status(404).send('There was an error deleting the form with id ' + req.query.formId + ' Error: ' + err);
                }
                res.status(200).send('The form with id ' + req.query.formId + ' was deleted');
            });
        }

    });

};

function createToken(user) {
    return jwt.sign(_.omit(user, 'password'), config.secret, { expiresInMinutes: 60 * 5 });
}

