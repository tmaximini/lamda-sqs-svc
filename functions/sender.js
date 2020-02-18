// Load the AWS SDK for Node.js
const AWS = require("aws-sdk");
// Set the region we will be using
AWS.config.update({ region: "eu-central-1" });
// Create SQS service client
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

module.exports.sendMsg = async event => {
  const eventBody = JSON.parse(event.body);

  const messageParams = {
    source_app: "nmbrs",
    username: eventBody.username || process.env.NMBRS_USERNAME,
    token: eventBody.password || eventBody.token || process.env.NMBRS_TOKEN,
    group: 1234,
    controller: "importDaysoff"
  };

  console.info(messageParams);

  // Setup the sendMessage parameter object
  const params = {
    MessageBody: JSON.stringify(messageParams),
    QueueUrl: `https://sqs.eu-central-1.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${process.env.SQS_QUEUE_NAME}`
  };

  try {
    const data = await sendSQSMessage(params);

    console.log("Successfully added message to", data);
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.log("Error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err })
    };
  }
};

function sendSQSMessage(params) {
  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
