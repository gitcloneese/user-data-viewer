const express = require('express');
const tunnelssh = require('tunnel-ssh');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const speakeasy = require("speakeasy");


const app = express();
const sshHost = process.env.SSH_HOST;
const sshUsername = process.env.SSH_USERNAME;
const sshPort = process.env.SSH_PORT;
const mongodbPort = process.env.SSH_TUNNEL_FORWARD_PORT;
const sshRemoteAddr = process.env.SSH_TUNNEL_REMOTE_ADDR;
const sshLocalAddr = process.env.SSH_TUNNEL_LOCAL_ADDR;
const privateKeyFile = process.env.SSH_PRIVATE_KEY_FILENAME;

const port = process.env.APPLICATION_PORT;
// const uri = 'mongodb://localhost:47107/xy3';
const uri = process.env.MONGO_CONNECTION_URI;
const mongoDatabase = process.env.MONGO_DATABASE;
const mongoCollection = process.env.MONGO_COLLECTION;
const mongoDocumentFieldName = process.env.MONGO_FIELDNAME;

const useOtp = process.env.USE_OTP ? process.env.USE_OTP.toLowerCase() == "true" : false;

const totpSecretFile = "./data/totp";
var totpSecret;

if (useOtp){
    if (fs.existsSync(totpSecretFile))
        totpSecret = fs.readFileSync(totpSecretFile).toString().trim();
    else {
        totpSecret = speakeasy.generateSecret().base32;
        fs.writeFileSync(totpSecretFile, totpSecret);
    }
    console.log("Using TOTP");
    console.log("  TOTP: " + totpSecret);
    console.log("  dataURL: " + speakeasy.otpauthURL({
        secret: totpSecret,
        encoding: "base32",
        label: "FR Dataexplorer"
    }))
}

if (sshHost != undefined) {
    console.log("Using SSH tunnel");
    console.log("  SSH Host: " + sshHost + ":" + sshPort);
    console.log("  SSH Username: " + sshUsername);
    console.log("  Using Keyfile: " + privateKeyFile)
    console.log(`  Tunnelling remote address ${sshRemoteAddr}:${mongodbPort} to local address ${sshLocalAddr}:${mongodbPort}`);

    // SSH Tunnel Configuration
    const sshConfig = {
        username: sshUsername,
        host: sshHost,
        port: parseInt(sshPort),
        privateKey: fs.readFileSync(`./data/${privateKeyFile}`)
    };
    
    function tunnel(sshOptions, port, autoClose = true){
        let forwardOptions = {
            srcAddr:sshLocalAddr,
            srcPort:port,
            dstAddr:sshRemoteAddr,
            dstPort:port
        }
    
        let tunnelOptions = {
            autoClose:autoClose
        }
        
        let serverOptions = {
            port: port
        }
    
        return tunnelssh.createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
    }
    
    tunnel(sshConfig,mongodbPort, false);
}

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.get('/read', async (req, res) => {
    const { userId } = req.query;
  
    const client = new MongoClient(uri, {});

    // Connect to MongoDB through the SSH tunnel
    client.connect()
        .then(() => {
            const db = client.db(mongoDatabase);
            const collection = db.collection(mongoCollection);
            console.log(`Querying ID ${userId}`);
            return collection.findOne({ userID: parseInt(userId) });
        })
        .then(result => {
            if (result == null) {
                res.status(400).send('No such ID found');
                console.log("No such Id")
                return;
            }

            res.json({ data: result[mongoDocumentFieldName] });
        })
        .catch(err => {
            console.error('MongoDB connection error:', err);
            res.status(500).send('Error connecting to MongoDB');
        })
        .finally(() => {
            client.close();
            // console.log('MongoDB connection closed');
        });
});

app.get('/readAll', async (req, res) => {
    const client = new MongoClient(uri, {});    
    
    client.connect()
        .then(() => {
            const db = client.db(mongoDatabase);
            const collection = db.collection(mongoCollection);
            console.log(`Querying All`);
            return collection.find({}).toArray();
        })
        .then(result => {
            if (result == null) {
                res.status(400).send('No such ID found');
                console.log("No such Id")
                return;
            }

            res.json({ data: result.map(document => document[mongoDocumentFieldName]) });
        })
        .catch(err => {
            console.error('MongoDB connection error:', err);
            res.status(500).send('Error connecting to MongoDB');
        })
        .finally(() => {
            client.close();
            // console.log('MongoDB connection closed');
        });
});

app.post('/update', async (req, res) => {
    const { userId, newData, totp } = req.body;

    if (!userId || !newData) {
        res.status(400).send('Missing userId or newData');
        return;
    }
    if (useOtp) {
        if (!totp) {
            res.status(400).send('Missing OTP');
            return;
        }
        var tokenValidates = speakeasy.totp.verify({
            secret: totpSecret,
            token: totp,
            window: 120,
            step: 30, //1hr validity 30s*120
            encoding: 'base32'
        });
        if (!tokenValidates) {
            res.status(400).send('Invalid OTP');
            return;
        }
    }

    const client = new MongoClient(uri, {});

    try {
        await client.connect();
        const db = client.db(mongoDatabase);
        const collection = db.collection(mongoCollection);

        console.log(`Updating ID ${parseInt(userId)}`);
        
        var updateData = {};
        updateData[mongoDocumentFieldName] = newData;

        // console.log(newData);
        const updateResult = await collection.findOneAndUpdate(
            { userID: parseInt(userId) },
            { $set: updateData },
            { returnOriginal: false }
        );

        if (updateResult.ok == 0) {
            throw new Error('Update Error');
        }

        var result = await collection.findOne({ userID: parseInt(userId) });


        res.json({ data: result[mongoDocumentFieldName] });
    } catch (err) {
        console.error('MongoDB operation error:', err);
        res.status(500).send(err.message);
    } finally {
        client.close();
        // console.log('MongoDB connection closed');
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
app.use(express.static('public'));
app.use(express.static('node_modules'));