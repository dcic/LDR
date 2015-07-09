__author__ = 'mmcdermott'

from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import requests
import json

lorettaClient = MongoClient('mongodb://mmcdermott:kroyweN@loretta')

lincsDb = lorettaClient['LINCS']
lorettaMd = lincsDb['milestones']

ldrClient = MongoClient('mongodb://mmcdermott:kroyweN@localhost')
ldrDb = ldrClient['LDR']
releases = ldrDb['dataReleases']
releases.drop()

nsUrl = 'http://146.203.54.165:7078/form'
headers = {'Content-Type': 'application/json'}

for doc in lorettaMd.find({}):
    out = {
        'approved': True,
        'released': False,
        'dateModified': datetime.now().isoformat(),
        'datasetName': doc['dcic-assay-name'],
        'description': doc['assay-info'],
        'metadata': {
            'assay': [],
            'cellLines': [],
            'perturbagens': [],
            'readouts': [],
            'manipulatedGene': [],
            'organism': [],
            'relevantDisease': [],
            'analysisTools': [],
            'tagsKeywords': []
        },
        'releaseDates': {
            'level1': '',
            'level2': '',
            'level3': '',
            'level4': ''
        },
        'urls': {
            'qcDocumentUrl': '',
            'pubMedUrl': '',
            'metadataUrl': '',
            'dataUrl': ''
        }
    }

    group = ''
    if doc['center'] == 'DTOXS':
        out['group'] = ObjectId('5519bd94ea7e106fc6784162')
        out['user'] = ObjectId('5519bd94ea7e106fc678416c')
        groupAbbr = 'd'
    elif doc['center'] == 'LINCS Transcriptomics':
        out['group'] = ObjectId('5519bd94ea7e106fc6784163')
        out['user'] = ObjectId('5519bd94ea7e106fc678416e')
        groupAbbr = 't'
    elif doc['center'] == 'HMS LINCS':
        out['group'] = ObjectId('5519bd94ea7e106fc6784164')
        out['user'] = ObjectId('5519bd94ea7e106fc6784170')
        groupAbbr = 'h'
    elif doc['center'] == 'LINCS PCCSE':
        out['group'] = ObjectId('5519bd94ea7e106fc6784165')
        out['user'] = ObjectId('5519bd94ea7e106fc678416b')
        groupAbbr = 'p'
    elif doc['center'] == 'NeuroLINCS':
        out['group'] = ObjectId('5519bd94ea7e106fc6784166')
        out['user'] = ObjectId('5519bd94ea7e106fc678416a')
        groupAbbr = 'n'
    elif doc['center'] == 'MEP LINCS':
        out['group'] = ObjectId('5519bd94ea7e106fc6784167')
        out['user'] = ObjectId('5519bd94ea7e106fc678416d')
        groupAbbr = 'm'

    print('GROUP: ' + groupAbbr)
    gPar = '&group=' + groupAbbr

    assayName = doc['assay']
    assayQuery = assayName.replace('+', '\%2B').replace('(', '\(').replace(')', '\)')
    print('ASSAY: ' + assayName)
    assayArr = requests.get(nsUrl + '/assay?name=' + assayQuery + gPar).json()
    # Add homo sapiens and ALS to each NeuroLINCS dataset
    if 'n' in groupAbbr:
        organismData = requests.get(nsUrl + '/organism?name=homo' + gPar).json()
        if len(organismData) == 0:
            organismData = requests.get(nsUrl + '/organism?name=homo').json()[0]
        else:
            organismData = organismData[0]
        organismData['group'] = 'n'
        organismId = requests.post(nsUrl + '/organism', data=json.dumps(organismData), headers=headers).json()
        out['metadata']['organism'] = [organismId]
        diseaseData = requests.get(nsUrl + '/disease?name=als' + gPar).json()
        if len(diseaseData) == 0:
            diseaseData = requests.get(nsUrl + '/disease?name=als').json()[0]
        else:
            diseaseData = diseaseData[0]
        diseaseData['group'] = 'n'
        diseaseId = requests.post(nsUrl + '/disease', data=json.dumps(diseaseData), headers=headers).json()
        out['metadata']['disease'] = [diseaseId]
    if len(assayArr) == 0:
        assayData = {
            'name': assayName,
            'info': doc['assay-info'],
            'group': groupAbbr
        }
        assayReq = requests.post(nsUrl + '/assay', data=json.dumps(assayData), headers=headers)
        assayId = assayReq.json()
    else:
        postData = assayArr[0]
        postData['group'] = groupAbbr
        assayReq = requests.post(nsUrl + '/assay', data=json.dumps(postData), headers=headers)
        assayId = assayReq.json()
    out['metadata']['assay'] = [assayId]

    for cLineObj in doc['cell-lines']:
        if 'name' not in cLineObj:
            continue
        cLineName = cLineObj['name'].replace('+', '\%2B').replace('(', '\(').replace(')', '\)')\
            .replace(' ', '%20').replace('#', '%23')
        if 'Which four?' in cLineName:
            continue
        # print('CELL LINE: ' + cLineName)
        cLineArr = requests.get(nsUrl + '/cell?name=' + cLineName + gPar).json()
        cLineObj['group'] = groupAbbr
        if len(cLineArr) == 0:
            cLineId = requests.post(nsUrl + '/cell', data=json.dumps(cLineObj), headers=headers).json()
        else:
            postData = cLineArr[0]
            postData['group'] = groupAbbr
            cLineId = requests.post(nsUrl + '/cell', data=json.dumps(postData), headers=headers).json()
        out['metadata']['cellLines'].append(cLineId)

    if 'perturbagens' in doc:
        for pertObj in doc['perturbagens']:
            if 'name' not in pertObj:
                continue
            pertName = pertObj['name'].replace('+', '\%2B').replace('(', '\(').replace(')', '\)')
            # print('PERTURBAGEN: ' + pertName)
            pertArr = requests.get(nsUrl + '/perturbagen?name=' + pertName + gPar).json()
            if len(pertArr) == 0:
                pertObj['group'] = groupAbbr
                pertReq = requests.post(nsUrl + '/perturbagen', data=json.dumps(pertObj), headers=headers)
                pertId = pertReq.json()
            else:
                postData = pertArr[0]
                postData['group'] = groupAbbr
                pertReq = requests.post(nsUrl + '/perturbagen', data=json.dumps(postData), headers=headers)
                pertId = pertReq.json()
            out['metadata']['perturbagens'].append(pertId)

    for rOutObj in doc['readouts']:
        rOutName = rOutObj['name'].replace('+', '\%2B').replace('(', '\(').replace(')', '\)')
        # print('READOUT: ' + rOutName)
        rOutArr = requests.get(nsUrl + '/readout?name=' + rOutName + gPar).json()
        if len(rOutArr) == 0:
            rOutObj['group'] = groupAbbr
            rOutReq = requests.post(nsUrl + '/readout', data=json.dumps(rOutObj), headers=headers)
            rOutId = rOutReq.json()
        else:
            postData = rOutArr[0]
            postData['group'] = groupAbbr
            rOutReq = requests.post(nsUrl + '/readout', data=json.dumps(postData), headers=headers)
            rOutId = rOutReq.json()
        out['metadata']['readouts'].append(rOutId)

    for dateObj in doc['release-dates']:
        if dateObj['releaseLevel'] == 1:
            out['releaseDates']['level1'] = dateObj['date']
        elif dateObj['releaseLevel'] == 2:
            out['releaseDates']['level2'] = dateObj['date']
        elif dateObj['releaseLevel'] == 3:
            out['releaseDates']['level3'] = dateObj['date']
        elif dateObj['releaseLevel'] == 4:
            out['releaseDates']['level4'] = dateObj['date']

    if 'release-link' in doc:
        out['urls']['dataUrl'] = doc['release-link']

    releases.insert(out)
