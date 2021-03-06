/**
 * @author Michael McDermott
 * Created on 7/10/15.
 */

var jwt = require('jsonwebtoken'),
  async = require('async'),
  _ = require('lodash'),
  Models = require('../models'),
  User = Models.User,
  Group = Models.Group,
  DataRelease = Models.DataRelease,
  Assay = Models.Assay,
  CellLine = Models.CellLine,
  Perturbagen = Models.Perturbagen,
  Readout = Models.Readout,
  Gene = Models.Gene,
  Disease = Models.Disease,
  Organism = Models.Organism,
  Tool = Models.Tool,
  secret = require('../config/database').secret,
  baseUrl = require('../config/baseUrl').baseUrl;

module.exports = function(app) {
  'use strict';

  app.get(baseUrl +
    '/api/autocomplete/:sample(assays|cellLines|perturbagens|readouts|genes|diseases|organisms|tools)',
    function(req, res) {
      var s = req.params.sample;
      var sample;

      if (s === 'assays') {
        sample = Assay;
      } else if (s === 'cellLines') {
        sample = CellLine;
      } else if (s === 'perturbagens') {
        sample = Perturbagen;
      } else if (s === 'readouts') {
        sample = Readout;
      } else if (s === 'genes') {
        sample = Gene;
      } else if (s === 'diseases') {
        sample = Disease;
      } else if (s === 'organisms') {
        sample = Organism;
      } else if (s === 'tools') {
        sample = Tool;
      }

      sample
        .find({ name: new RegExp(req.query.q, 'i') })
        .lean()
        .limit(10)
        .exec(function(err, results) {
          if (err) {
            console.log(err);
            res.status(404).send('There was an error completing your request');
          } else {
            res.status(200).send(results);
          }
        });
    }
  );

  app.get(baseUrl +
    '/api/:sample(assays|cellLines|perturbagens|readouts|genes|diseases|organisms|tools)',
    function(req, res) {
      var s = req.params.sample;
      var limit = req.query.limit;
      var sample;

      if (s === 'assays') {
        sample = Assay;
      } else if (s === 'cellLines') {
        sample = CellLine;
      } else if (s === 'perturbagens') {
        sample = Perturbagen;
      } else if (s === 'readouts') {
        sample = Readout;
      } else if (s === 'genes') {
        sample = Gene;
      } else if (s === 'diseases') {
        sample = Disease;
      } else if (s === 'organisms') {
        sample = Organism;
      } else if (s === 'tools') {
        sample = Tool;
      }

      var sampleChain = sample.find({}).lean();
      if (!!limit) {
        sampleChain = sampleChain.limit(limit);
      }
      sampleChain
        .exec(function(err, results) {
          if (err) {
            console.log(err);
            res.status(404).send('There was an error completing your request');
          } else {
            res.status(200).send(results);
          }
        });
    }
  );

  app.get(baseUrl +
    '/api/:sample(assays|cellLines|perturbagens|readouts|genes|diseases|organisms|tools)/count',
    function(req, res) {
      var s = req.params.sample;
      var sample;

      if (s === 'assays') {
        sample = Assay;
      } else if (s === 'cellLines') {
        sample = CellLine;
      } else if (s === 'perturbagens') {
        sample = Perturbagen;
      } else if (s === 'readouts') {
        sample = Readout;
      } else if (s === 'genes') {
        sample = Gene;
      } else if (s === 'diseases') {
        sample = Disease;
      } else if (s === 'organisms') {
        sample = Organism;
      } else if (s === 'tools') {
        sample = Tool;
      }

      sample
        .count(function(err, count) {
          if (err) {
            console.log(err);
          } else {
            res.status(200).send(count);
          }
        });
    }
  );

  app.get(baseUrl +
    '/api/:sample(assays|cellLines|perturbagens|readouts|genes|diseases|organisms|tools)/:id',
    function(req, res) {
      var id = req.params.id;
      var s = req.params.sample;
      var sample;

      if (s === 'assays') {
        sample = Assay;
      } else if (s === 'cellLines') {
        sample = CellLine;
      } else if (s === 'perturbagens') {
        sample = Perturbagen;
      } else if (s === 'readouts') {
        sample = Readout;
      } else if (s === 'genes') {
        sample = Gene;
      } else if (s === 'diseases') {
        sample = Disease;
      } else if (s === 'organisms') {
        sample = Organism;
      } else if (s === 'tools') {
        sample = Tool;
      }

      var query = { _id: id };
      sample
        .findOne(query)
        .lean()
        .exec(function(err, results) {
          if (err) {
            console.log(err);
            res.status(404).send(
              'There was an error completing your request');
          } else {
            res.status(200).send(results);
          }
        });
    }
  );

  function getCounts(released, cb) {
    async.waterfall([
      function(callback) {
        User.count(function(err, userCount) {
          callback(err, userCount);
        });
      },
      function(userCount, callback) {
        Group
          .where('name')
          // Don't count NIH
          .ne('NIH')
          .count(function(err, groupCount) {
            callback(err, userCount, groupCount);
          });
      },
      function(userCount, groupCount, callback) {
        var dataReleaseChain;
        if (released) {
          dataReleaseChain = DataRelease.find({ released: true });
        } else {
          dataReleaseChain = DataRelease.find({});
        }
        dataReleaseChain
          .lean()
          .exec(function(err, releases) {
            if (err) {
              callback(err, null);
              return;
            }
            var assays = [];
            var cellLines = [];
            var perturbagens = [];
            var readouts = [];
            var diseases = [];
            var genes = [];
            var organisms = [];

            _.each(releases, function(release) {
              assays = _.uniq(_.union(release.metadata.assay, assays));
              cellLines = _.uniq(_.union(release.metadata.cellLines, cellLines));
              perturbagens = _.uniq(_.union(release.metadata.perturbagens, perturbagens));
              readouts = _.uniq(_.union(release.metadata.readouts, readouts));
              diseases = _.uniq(_.union(release.metadata.relevantDisease, diseases));
              organisms = _.uniq(_.union(release.metadata.organisms, organisms));
              genes = _.uniq(_.union(release.metadata.manipulatedGene, genes));
            });

            var summary = {
              users: userCount,
              groups: groupCount,
              dataReleases: releases.length,
              assays: assays.length,
              cellLines: cellLines.length,
              perturbagens: perturbagens.length,
              readouts: readouts.length,
              diseases: diseases.length,
              organisms: organisms.length,
              genes: genes.length
            };
            callback(null, summary);
          });
      }
    ], function(err, summary) {
      cb(err, summary);
    });
  }

  app.get(baseUrl + '/api/counts', function(req, res) {
    getCounts(false, function(err, countsObj) {
      if (err) {
        res.status(500).send('An error occurred obtaining counts');
      } else {
        res.status(200).send(countsObj);
      }
    });
  });

  app.get(baseUrl + '/api/counts/released', function(req, res) {
    getCounts(true, function(err, countsObj) {
      if (err) {
        res.status(500).send('An error occurred obtaining counts');
      } else {
        res.status(200).send(countsObj);
      }
    });
  });

  app.post(baseUrl +
    '/api/secure/:sample(assays|cellLines|perturbagens|readouts|genes|diseases|organisms|tools)/',
    function(req, res) {
      var inputData = req.body;
      var s = req.params.sample;
      var token, user, sample;

      if (req.headers.authorization &&
        req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
        user = jwt.verify(token, secret, {
          issuer: 'http://amp.pharm.mssm.edu/LDR/'
        });
        inputData.group = user.group._id;
      } else {
        res.status(401).send('Token or URL are invalid. Try again.');
      }

      if (s === 'assays') {
        sample = Assay;
      } else if (s === 'cellLines') {
        sample = CellLine;
      } else if (s === 'perturbagens') {
        sample = Perturbagen;
      } else if (s === 'readouts') {
        sample = Readout;
      } else if (s === 'genes') {
        sample = Gene;
      } else if (s === 'diseases') {
        sample = Disease;
      } else if (s === 'organisms') {
        sample = Organism;
      } else if (s === 'tools') {
        sample = Tool;
      }

      sample.create(inputData, function(err, resSample) {
        if (err) {
          console.log(err);
          // Catch duplicate key error
          if (err.code === 11000) {
            res.status(400).send('A sample with that name ' +
              'already exists. Please try another.');
          } else {
            res.status(400).send('A ' + err.name + ' occurred while ' +
              'saving to the database.');
          }
        } else {
          res.status(200).send(resSample._id);
        }
      });
    }
  );
};
