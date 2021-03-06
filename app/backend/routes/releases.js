var jsonWT = require('jsonwebtoken'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  secret = require('../config/database').secret,
  Models = require('../models'),
  CellLine = Models.CellLine,
  DataRelease = Models.DataRelease,
  Group = Models.Group,
  baseUrl = require('../config/baseUrl').baseUrl;

module.exports = function(app) {
  'use strict';

  // Endpoint for searching releases. NEEDS QUERY PARAMETER.
  app.get(baseUrl + '/api/releases/search', function(req, res) {
    var query = req.query.q;
    if (!query) {
      res.status(400).send('Query string not properly formatted.');
    }
    // 1. Find groups matching query and gather ids
    // 2. Find releases matching from the group that matches an
    //    id found in step 1.
    // 3. Find releases matching query.
    Group
      .find({ name: new RegExp(query, 'i') })
      .lean()
      .exec(function(err, groups) {
        if (err) {
          res.status(500).send('There was an error searching for releases.');
        }

        // _.map() and _.pluck do not work for mongoose arrays
        var ids = [];
        _.each(groups, function(obj) { ids.push(obj._id); });
        DataRelease
          .find({ group: { $in: ids } })
          .sort({ dateModified: -1 })
          .populate([
            { path: 'group', model: 'Group' },
            { path: 'messages.user', model: 'User' },
            { path: 'metadata.assay', model: 'Assay' },
            { path: 'metadata.cellLines', model: 'CellLine' },
            { path: 'metadata.perturbagens', model: 'Perturbagen' },
            { path: 'metadata.readouts', model: 'Readout' },
            { path: 'metadata.manipulatedGene', model: 'Gene' },
            { path: 'metadata.organism', model: 'Organism' },
            { path: 'metadata.relevantDisease', model: 'Disease' },
            { path: 'metadata.analysisTools', model: 'Tool' }
          ])
          .lean()
          .exec(function(drgErr, drgResults) {
            if (drgErr) {
              console.log(drgErr);
              res.status(404).send('Error searching releases');
            }

            DataRelease
              .find({ $or: [
                  { datasetName: new RegExp(query, 'i') },
                  { 'assay.name': new RegExp(query, 'i') },
                  { 'abbr': new RegExp(query, 'i') }
              ]})
              .sort({ dateModified: -1 })
              .populate([
                { path: 'group', model: 'Group' },
                { path: 'messages.user', model: 'User' },
                { path: 'metadata.assay', model: 'Assay' },
                { path: 'metadata.cellLines', model: 'CellLine' },
                { path: 'metadata.perturbagens', model: 'Perturbagen' },
                { path: 'metadata.readouts', model: 'Readout' },
                { path: 'metadata.manipulatedGene', model: 'Gene' },
                { path: 'metadata.organism', model: 'Organism' },
                { path: 'metadata.relevantDisease', model: 'Disease' },
                { path: 'metadata.analysisTools', model: 'Tool' }
              ])
              .lean()
              .exec(function(resultErr, results) {
                if (resultErr) {
                  console.log(resultErr);
                  res.status(404).send('Error searching releases');
                } else {
                  var data = _.union(results, drgResults);
                  var uniqueData = _.uniq(data, 'datasetName');
                  res.status(200).send(uniqueData);
                }
              });
          });
      });
  });

  app.get(baseUrl + '/api/releases/filter', function(req, res) {
    var dsName;
    var cellLineQuery;
    if (req.query.dataset) {
      dsName = new RegExp(req.query.dataset, 'i');
    }
    if (req.query.cellLine) {
      cellLineQuery = new RegExp(req.query.cellLine, 'i');
    }
    var cellLineIds = [];
    var perturbagenIds = [];
    if (req.query.perturbagens) {
      perturbagenIds = req.query.perturbagens.split(',');
    }

    function getCellLineId() {
      CellLine
        .find({ $or: [
          { name: cellLineQuery },
          { abbr: cellLineQuery }
        ]})
        .lean()
        .exec(function(err, cLines) {
          if (err) {
            res.status(404).send('Cell line could not be found');
          } else {
            cellLineIds = _.map(cLines, function(line) {
              return line._id;
            });
            findReleases();
          }
        });
    }

    function findReleases() {
      var sendResults = false;
      var chain = DataRelease.find({});
      if (!_.isUndefined(dsName)) {
        chain = chain.where('abbr').equals(dsName);
        sendResults = true;
      }
      if (cellLineIds.length > 0) {
        chain = chain.where('metadata.cellLines').in(cellLineIds);
        sendResults = true;
      }
      if (perturbagenIds.length > 0) {
        chain = chain.where('metadata.perturbagens').in(perturbagenIds);
        sendResults = true;
      }
      chain
        .populate([{
          path: 'group',
          model: 'Group'
        }, {
          path: 'messages.user',
          model: 'User'
        }, {
          path: 'metadata.assay',
          model: 'Assay'
        }, {
          path: 'metadata.readouts',
          model: 'Readout'
        }, {
          path: 'metadata.organism',
          model: 'Organism'
        }, {
          path: 'metadata.analysisTools',
          model: 'Tool'
        }, {
          path: 'metadata.cellLines',
          model: 'CellLine'
        }, {
          path: 'metadata.manipulatedGene',
          model: 'Gene'
        }, {
          path: 'metadata.relevantDisease',
          model: 'Disease'
        }, {
          path: 'metadata.perturbagens',
          model: 'Perturbagen'
        }])
        .exec(function(err, results) {
          if (err) {
            console.log(err);
            res.status(404).send('Error message');
          } else if (sendResults) {
            res.status(200).send(results);
          } else {
            res.status(240).send([]);
          }
        });
    }

    if (!_.isUndefined(cellLineQuery)) {
      getCellLineId();
    } else {
      findReleases();
    }
  });

  // Returns empty release for initialization on front-end
  app.get(baseUrl + '/api/releases/form/', function(req, res) {
    var releaseInit = {
      datasetName: '',
      description: '',
      metadata: {
        assay: [],
        cellLines: [],
        perturbagens: [],
        readouts: [],
        manipulatedGene: [],
        organism: [],
        relevantDisease: [],
        analysisTools: [],
        tagsKeywords: []
      },
      releaseDates: {
        level1: '',
        level2: '',
        level3: '',
        level4: ''
      },
      urls: {
        pubMedUrl: '',
        dataUrl: '',
        metadataUrl: '',
        qcDocumentUrl: ''
      }
    };
    res.status(200).send(releaseInit);
  });

  // Individual release endpoint.
  // Query id returns form with that id for editing on front end.
  app.get(baseUrl + '/api/releases/form/:id', function(req, res) {
    DataRelease
      .findOne({
        _id: req.params.id
      })
      .populate([{
        path: 'group',
        model: 'Group'
      }, {
        path: 'messages.user',
        model: 'User'
      }, {
        path: 'metadata.assay',
        model: 'Assay'
      }, {
        path: 'metadata.cellLines',
        model: 'CellLine'
      }, {
        path: 'metadata.perturbagens',
        model: 'Perturbagen'
      }, {
        path: 'metadata.readouts',
        model: 'Readout'
      }, {
        path: 'metadata.manipulatedGene',
        model: 'Gene'
      }, {
        path: 'metadata.organism',
        model: 'Organism'
      }, {
        path: 'metadata.relevantDisease',
        model: 'Disease'
      }, {
        path: 'metadata.analysisTools',
        model: 'Tool'
      }])
      .lean()
      .exec(function(err, release) {
        if (err) {
          console.log(err);
          res.status(404).send('Error: Release could not be found. ' +
            'Id may be invalid');
        } else if (!release) {
          res.status(404).send('Error: Release with given id could ' +
            'not be found.');
        } else {
          res.status(200).send(release);
        }
      });
  });

  // Multiple releases endpoint for all releases
  app.get(baseUrl + '/api/releases/', function(req, res) {
    DataRelease
      .find({})
      .populate([{
        path: 'group',
        model: 'Group'
      }, {
        path: 'messages.user',
        model: 'User'
      }, {
        path: 'metadata.assay',
        model: 'Assay'
      }, {
        path: 'metadata.cellLines',
        model: 'CellLine'
      }, {
        path: 'metadata.perturbagens',
        model: 'Perturbagen'
      }, {
        path: 'metadata.readouts',
        model: 'Readout'
      }, {
        path: 'metadata.manipulatedGene',
        model: 'Gene'
      }, {
        path: 'metadata.organism',
        model: 'Organism'
      }, {
        path: 'metadata.relevantDisease',
        model: 'Disease'
      }, {
        path: 'metadata.analysisTools',
        model: 'Tool'
      }])
      .lean()
      .exec(function(err, allData) {
        if (err) {
          console.log(err);
          res.status(404).send('Releases could not be found.');
        } else {
          res.status(200).send(allData);
        }
      });
  });

  // Multiple releases endpoint for all releases
  app.get(baseUrl + '/api/releases/released', function(req, res) {
    DataRelease
      .find({ released: true })
      .populate([{
        path: 'group',
        model: 'Group'
      }, {
        path: 'messages.user',
        model: 'User'
      }, {
        path: 'metadata.assay',
        model: 'Assay'
      }, {
        path: 'metadata.cellLines',
        model: 'CellLine'
      }, {
        path: 'metadata.perturbagens',
        model: 'Perturbagen'
      }, {
        path: 'metadata.readouts',
        model: 'Readout'
      }, {
        path: 'metadata.manipulatedGene',
        model: 'Gene'
      }, {
        path: 'metadata.organism',
        model: 'Organism'
      }, {
        path: 'metadata.relevantDisease',
        model: 'Disease'
      }, {
        path: 'metadata.analysisTools',
        model: 'Tool'
      }])
      .lean()
      .exec(function(err, allData) {
        if (err) {
          console.log(err);
          res.status(404).send('Releases could not be found.');
        } else {
          res.status(200).send(allData);
        }
      });
  });

  // Multiple releases endpoint for specific group or user
  app.get(baseUrl + '/api/releases/:type(group|user)/:id',
    function(req, res) {
      var query = {};
      if (req.params.type === 'group') {
        query = {
          group: req.params.id
        };
      }
      if (req.params.type === 'user') {
        query = {
          user: req.params.id
        };
      }
      DataRelease
        .find(query)
        .populate([{
          path: 'group',
          model: 'Group'
        }, {
          path: 'messages.user',
          model: 'User'
        }, {
          path: 'metadata.assay',
          model: 'Assay'
        }, {
          path: 'metadata.cellLines',
          model: 'CellLine'
        }, {
          path: 'metadata.perturbagens',
          model: 'Perturbagen'
        }, {
          path: 'metadata.readouts',
          model: 'Readout'
        }, {
          path: 'metadata.manipulatedGene',
          model: 'Gene'
        }, {
          path: 'metadata.organism',
          model: 'Organism'
        }, {
          path: 'metadata.relevantDisease',
          model: 'Disease'
        }, {
          path: 'metadata.analysisTools',
          model: 'Tool'
        }])
        .lean()
        .exec(function(err, releases) {
          if (err) {
            console.log(err);
            res.status(404).send('Releases could not be found.');
          } else {
            res.status(200).send(releases);
          }
        });
    }
  );

  // Releases endpoint to get latest approved releases
  app.get(baseUrl + '/api/releases/approved/', function(req, res) {
    DataRelease
      .find({
        approved: true
      })
      .sort({
        released: -1,
        'releaseDates.upcoming': -1
      })
      //.limit(25)
      .populate([{
        path: 'group',
        model: 'Group'
      }, {
        path: 'messages.user',
        model: 'User'
      }, {
        path: 'metadata.assay',
        model: 'Assay'
      }, {
        path: 'metadata.cellLines',
        model: 'CellLine'
      }, {
        path: 'metadata.perturbagens',
        model: 'Perturbagen'
      }, {
        path: 'metadata.readouts',
        model: 'Readout'
      }, {
        path: 'metadata.manipulatedGene',
        model: 'Gene'
      }, {
        path: 'metadata.organism',
        model: 'Organism'
      }, {
        path: 'metadata.relevantDisease',
        model: 'Disease'
      }, {
        path: 'metadata.analysisTools',
        model: 'Tool'
      }])
      .lean()
      .exec(function(err, releases) {
        if (err) {
          console.log(err);
          res.status(404).send('Could not return ' +
            'approved releases');
        } else {
          res.status(200).send(releases);
        }
      });
  });

  // Releases endpoint for homepage infinite scroll
  app.get(baseUrl + '/api/releases/approved/:afterId/', function(req, res) {
    var afterId = req.params.afterId;
    var query = {
      _id: afterId
    };
    DataRelease
      .findOne(query)
      .lean()
      .exec(function(err, latestRelease) {
        if (err) {
          console.log(err);
          res.status(404).send('Could not return release');
        } else {
          var dateToSearch = latestRelease.releaseDates.upcoming;
          if (!(dateToSearch instanceof Date)) {
            dateToSearch = new Date(dateToSearch);
          }
          DataRelease
            .find({
              'releaseDates.upcoming': {
                $gt: dateToSearch
              }
            })
            .sort({
              released: -1,
              'releaseDates.upcoming': 1
            })
            .limit(25)
            .populate([{
              path: 'group',
              model: 'Group'
            }, {
              path: 'messages.user',
              model: 'User'
            }, {
              path: 'metadata.assay',
              model: 'Assay'
            }, {
              path: 'metadata.cellLines',
              model: 'CellLine'
            }, {
              path: 'metadata.perturbagens',
              model: 'Perturbagen'
            }, {
              path: 'metadata.readouts',
              model: 'Readout'
            }, {
              path: 'metadata.manipulatedGene',
              model: 'Gene'
            }, {
              path: 'metadata.organism',
              model: 'Organism'
            }, {
              path: 'metadata.relevantDisease',
              model: 'Disease'
            }, {
              path: 'metadata.analysisTools',
              model: 'Tool'
            }])
            .lean()
            .exec(function(afterErr, afterReleases) {
              if (afterErr) {
                console.log(afterErr);
                res.status(404).send('Could not find releases' +
                  ' after ' + latestRelease.releaseDates.upcoming);
              } else {
                res.status(200).send(afterReleases);
              }
            });
        }
      });
  });

  // Temporary solution to generate DID.
  // Get first letter of first three words in dataset name
  var generateDid = function(dataset, cb) {
  };

  var exists = function(input) {
    return input !== '' && input !== null && !!input;
  };

  var formatDates = function(releaseDates) {
    var releaseDates = releaseDates || {};
    _.each(releaseDates, function(date) {
      if (date) {
        date = new Date(date);
      } else {
        date = '';
      }
      return date;
    });

    releaseDates.upcoming = exists(releaseDates.level1) ?
      releaseDates.level1 : exists(releaseDates.level2) ?
      releaseDates.level2 : exists(releaseDates.level3) ?
      releaseDates.level3 : exists(releaseDates.level4) ?
      releaseDates.level4 : '';
    releaseDates.upcoming = new Date(releaseDates.upcoming);
    return releaseDates;
  };

  var formatData = function(inputData, cb) {
    DataRelease
      .find({})
      .count()
      .exec(function(err, drCnt) {
        if (err) {
          console.log(err);
          res.status(404).send('Number of releases could not be found');
        }
        Group
          .findOne({_id: inputData.group })
          .lean()
          .exec(function(groupErr, group) {
            if (groupErr) {
              console.log(groupErr);
              cb('Release\'s group could not be found', null);
            }
            // Add one to the number of releases because this is being added
            if (!inputData.did && !!group) {
              drCnt++;
              var did = 'LINCS_' + group.name + '_';
              var wordArr = [];
              if (inputData.datasetName) {
                wordArr = inputData.datasetName.split(' ');
              } else {
                cb('Release does not have a dataset name', null);
              }
              var dNameAbbr = '';
              wordArr.forEach(function(word) {
                dNameAbbr += word[0].toUpperCase();
              });
              var drStr = drCnt < 100 ? '0' + drCnt.toString() : drCnt.toString();
              did += dNameAbbr.substr(0, 3) + '_' + drStr;
              inputData.did = did;
            } else if (!group) {
              cb('Release does not have an associated group', null);
            }
            inputData.approved = true;
            inputData.dateModified = new Date();
            inputData.releaseDates = formatDates(inputData.releaseDates);
            cb(null, inputData);
          });
      });
  };

  // Post release without id and save it to the database
  app.post(baseUrl + '/api/secure/releases/form/', function(req, res) {
    console.log(req.body);
    formatData(req.body, function(err, inputData) {
      if (err) {
        res.status(400).send(err);
      }
      DataRelease.create(inputData, function(err, form) {
        if (err) {
          console.log(err);
          res.status(400).send('A ' + err.name + ' occurred while ' +
            'saving JSON to database. Please confirm that your JSON ' +
            'is formatted properly. Visit http://www.jsonlint.com ' +
            'to confirm.');
        } else {
          res.status(200).send(form);
        }
      });
    });
  });

  // POST release with id, find it and update.
  app.post(baseUrl + '/api/secure/releases/form/:id', function(req, res) {
    formatData(req.body, function(err, inputData) {
      if (err) {
        res.status(500).send(err);
      }

      // Updated so now everything is approved. May revert back
      //
      // // Check if released. If so, do not set approved to false.
      // // Should never be released here.
      // if (!inputData.released) {
      //   inputData.approved = false;
      // }
      inputData.needsEdit = false;
      var query = {
        _id: req.params.id
      };
      // Can't update _id field
      delete inputData._id;
      DataRelease.update(query, inputData, function(err, release) {
        if (err) {
          console.log(err);
          res.status(400).send(
            'There was an error updating entry with ' +
            'id ' + query._id + '. Please try again');
        } else {
          res.status(202).send(release);
        }
      });
    });
  });

  // POST endpoint for released forms. Only update urls
  app.post(baseUrl + '/api/secure/releases/form/:id/urls/', function(req, res) {
    var id = req.params.id;
    var query = {
      _id: id
    };
    var urls = req.body;
    DataRelease.findOne(query, function(err, release) {
      if (err) {
        console.log(err);
        res.status(400).send('There was an error updating urls for ' +
          'entry with id ' + query._id + '. Please try again.');
      } else {
        release.dateModified = new Date();
        release.urls = urls;
        release.save();
        res.status(202).send(release);
      }
    });
  });

  // POST endpoint for messages and superuser to return unapproved releases
  app.post(baseUrl + '/api/secure/releases/form/:id/:type(return|message)/',
    function(req, res) {
      var id = req.params.id;
      var query = {
        _id: id
      };
      var messageObj = req.body;
      messageObj.date = new Date();

      if (req.headers.authorization &&
        req.headers.authorization.split(' ')[0] === 'Bearer') {
        var token = req.headers.authorization.split(' ')[1];
        var user = jsonWT.verify(token, secret, {
          issuer: 'http://amp.pharm.mssm.edu/LDR/'
        });
        messageObj.user = user._id;
        DataRelease.findOne(query, function(err, release) {
          if (err) {
            console.log(err);
            res.status(400).send('There was an error updating messages' +
              ' for entry with id ' + id + '. Please try again.');
          } else {
            if (req.params.type === 'return') {
              release.needsEdit = true;
              messageObj.return = true;
            } else {
              messageObj.return = false;
            }
            release.messages.push(messageObj);
            release.save();
            res.status(202).send('Message POSTed');
          }
        });
      } else {
        res.status(401).send('Token or URL are invalid. Try again.');
      }
    });

  app.post(baseUrl + '/api/secure/releases/form/:id/message/remove/',
    function(req, res) {
      var id = req.params.id;
      var query = {
        _id: id
      };
      var messageObj = req.body;

      DataRelease
        .findOne(query)
        .exec(function(err, release) {
          if (err) {
            console.log(err);
            res.status(400).send('There was an error updating messages' +
              ' for entry with id ' + id + '. Please try again.');
          } else {
            // Need to call .toObject() in order for lodash to work
            var releaseObj = release.toObject();
            var messages = releaseObj.messages;
            _.remove(messages, function(msg) {
              console.log(messageObj._id === msg._id.toString());
              return messageObj._id === msg._id.toString();
            });
            release.messages = messages;
            release.save();
            res.status(202).send('Message deleted');
          }
        });
    });

  app.get(baseUrl + '/api/releases/export', function(req, res) {

    var randName = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (var i = 0; i < 5; i++) {
      randName += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    var ids = req.query.ids;
    ids = ids.split(',');

    var stream = fs.createWriteStream(path.join(__dirname, '/', randName + '.txt'));

    DataRelease
      .find({ _id: { $in: ids } })
      .populate([
        { path: 'group', model: 'Group' },
        { path: 'messages.user', model: 'User' },
        { path: 'metadata.assay', model: 'Assay' },
        { path: 'metadata.cellLines', model: 'CellLine' },
        { path: 'metadata.perturbagens', model: 'Perturbagen' },
        { path: 'metadata.readouts', model: 'Readout' },
        { path: 'metadata.manipulatedGene', model: 'Gene' },
        { path: 'metadata.organism', model: 'Organism' },
        { path: 'metadata.relevantDisease', model: 'Disease' },
        { path: 'metadata.analysisTools', model: 'Tool' }
      ])
      .lean()
      .exec(function(err, releases) {
        if (err) {
          console.log(err);
        }
        _.each(releases, function(release) {
          var meta = release.metadata;
          var dates = release.releaseDates;
          var urls = release.urls;

          stream.write('DID\t' + release.did + '\n');
          stream.write('DSN\t' + release.datasetName + '\n');
          try {
            stream.write('CTR\t' + release.group.name + '\n');
          } catch (e) {
            console.log('ERROR FOR ' + release._id);
          }
          stream.write('DES\t' + release.description + '\n');
          stream.write('ASY\t' + meta.assay[0].name + '\n');

          _.each(meta.cellLines, function(obj) {
            var appStr = 'CLN\t' + obj.name;
            if (obj.type) {
              appStr += '\t' + obj.type;
            } else {
              appStr += '\t';
            }
            if (obj.class) {
              appStr += '\t' + obj.class;
            } else {
              appStr += '\t';
            }
            if (obj.tissue) {
              appStr += '\t' + obj.tissue;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          _.each(meta.perturbagens, function(obj) {
            var appStr = 'PRT\t' + obj.name;
            if (obj.type) {
              appStr += '\t' + obj.type;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          _.each(meta.readouts, function(obj) {
            var appStr = 'RDO\t' + obj.name;
            if (obj.datatype) {
              appStr += '\t' + obj.datatype;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          _.each(meta.manipulatedGene, function(obj) {
            var appStr = 'PRT\t' + obj.name;
            if (obj.organism) {
              appStr += '\t' + obj.organism;
            } else {
              appStr += '\t';
            }
            if (obj.reference) {
              appStr += '\t' + obj.reference;
            } else {
              appStr += '\t';
            }
            if (obj.url) {
              appStr += '\t' + obj.url;
            } else {
              appStr += '\t';
            }
            if (obj.description) {
              appStr += '\t' + obj.description;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          _.each(meta.organism, function(obj) {
            var appStr = 'ORG\t' + obj.name;
            if (obj.commonName) {
              appStr += '\t' + obj.commonName;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          _.each(meta.relevantDisease, function(obj) {
            var appStr = 'DIS\t' + obj.name;
            if (obj.description) {
              appStr += '\t' + obj.description;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          _.each(meta.analysisTools, function(obj) {
            var appStr = 'ATL\t' + obj.name;
            if (obj.url) {
              appStr += '\t' + obj.url;
            } else {
              appStr += '\t';
            }
            if (obj.description) {
              appStr += '\t' + obj.description;
            } else {
              appStr += '\t';
            }
            stream.write(appStr + '\n');
          });

          stream.write('TKS\t' + meta.tagsKeywords.join('\t') +
            '\n');

          try {
            stream.write('LV1\t' + dates.level1.toString() + '\n');
          } catch (e) {
            stream.write('LV1\t' + '' + '\n');
          }

          try {
            stream.write('LV2\t' + dates.level2.toString() + '\n');
          } catch (e) {
            stream.write('LV2\t' + '' + '\n');
          }

          try {
            stream.write('LV3\t' + dates.level3.toString() + '\n');
          } catch (e) {
            stream.write('LV3\t' + '' + '\n');
          }

          try {
            stream.write('LV4\t' + dates.level4.toString() + '\n');
          } catch (e) {
            stream.write('LV4\t' + '' + '\n');
          }

          stream.write('PUB\t' + urls.pubMedUrl + '\n');
          stream.write('DTA\t' + urls.dataUrl + '\n');
          stream.write('MET\t' + urls.metadataUrl + '\n');
          stream.write('QCD\t' + urls.qcDocumentUrl + '\n');

          try {
            stream.write('MOD\t' + release.dateModified.toString() +
              '\n');
          } catch (e) {
            stream.write('MOD\t' + '' + '\n');
          }

          var approved = release.approved ? 'YES' : 'NO';
          stream.write('APR\t' + approved + '\n');

          var released = release.released ? 'YES' : 'NO';
          stream.write('REL\t' + released + '\n');

          stream.write('\n');

        });
        stream.end();
        stream.on('finish', function() {
          res.download(path.join(__dirname, '/', randName + '.txt'),
            'LDR-export.txt',
            function(downloadError) {
              if (downloadError) {
                console.log(downloadError);
                res.status(downloadError.status).end();
              } else {
                fs.unlink(path.join(__dirname, '/', randName + '.txt'),
                  function(deleteError) {
                    if (deleteError) {
                      throw deleteError;
                    }
                  });
              }
            }
          );
        });
      });
  });

  // Release an entry. Must have a data URL and be approved
  app.put(baseUrl + '/api/secure/releases/form/:id/release',
    function(req, res) {
      var id = req.params.id;
      var query = {
        _id: id
      };
      DataRelease
        .findOne(query)
        .exec(function(err, release) {
          if (err) {
            console.log(err);
            res.status(404).send('An error occurred getting ' +
              'release with id: ' + id);
          } else if (release.urls.dataUrl === '') {
            res.status(403).send('Data URL required!');
          } else if (release.approved === false) {
            res.status(403).send('Dataset must be approved!');
          } else {
            release.released = true;
            release.save();
            res.status(204).send('Dataset successfully released.');
          }
        });
    }
  );

  // DELETE individual release
  app.delete(baseUrl + '/api/secure/releases/form/:id', function(req, res) {
    DataRelease
      .findOne({
        _id: req.params.id
      })
      .remove(function(err) {
        if (err) {
          console.log(err);
          res.status(404).send('There was an error deleting the ' +
            'data release with id ' + req.params.id +
            ' Error: ' + err);
        }
        res.status(200).send('The data release with id ' +
          req.params.id + ' was deleted');
      });
  });
};
