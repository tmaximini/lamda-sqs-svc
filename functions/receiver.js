// Load the AWS SDK for Node.js
const AWS = require("aws-sdk");
// Set the region we will be using
AWS.config.update({ region: "eu-central-1" });
// Create S3 service client
const S3 = new AWS.S3({ region: "eu-central-1" });

const s3DefaultParams = {
  ACL: "bucket-owner-read",
  Bucket: process.env.S3_BUCKET_NAME || "nmbrs-users-absence",
  Conditions: [
    ["content-length-range", 0, 1024000], // 1 Mb
    { acl: "bucket-owner-read" }
  ]
};

const { getAllAbsenceTimes } = require("../lib/Nmbrs");

/**
 * This lambda gets triggered whenever a message comes into the specified SQS queue.
 * The Messages come into batches of max. 10 items in the even.Records key
 */
module.exports.handleIncomingMsg = async event => {
  console.log(event.Records);

  for (let i = 0; i < event.Records.length; i++) {
    const element = JSON.parse(event.Records[i].body);

    const auth = {
      Username: element.username,
      Token: element.token
    };

    const absenceTimes = await getAllAbsenceTimes(auth);

    const promises = [];

    for (let i = 0; i < absenceTimes.length; i++) {
      const absenceRecord = absenceTimes[i];

      promises.push(
        new Promise((resolve, reject) => {
          S3.upload(
            {
              ...s3DefaultParams,
              Body: JSON.stringify({
                ...absenceRecord,
                source_app: element.source_app,
                group: element.group,
                controller: element.controller
              }),
              Key: `importDaysoff/${absence.personId}.json`
            },
            (err, data) => {
              if (err) {
                console.log("error uploading...", err);
                reject(err);
              } else {
                console.log("successfully uploaded file...", data);
                resolve(data);
              }
            }
          );
        })
      );
    }

    return Promise.all(promises);
  }
};
