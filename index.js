var { authorize, listLabels } = require("./authorize");
const { google } = require("googleapis");
// the auth will contain the verified credentials
let auth;

// to get the credentials
authorize()
  .then(async (Authdata) => {
    auth = Authdata;

    const labels = await listLabels(auth);

    // console.log(JSON.stringify(labels));
    const TestLabel = labels.filter((label) => label.name === "Test");

    const gmail = google.gmail({ version: "v1", auth });

    if (!TestLabel.length) {
      console.log("not existing");
      const createdLabel = await gmail.users.labels.create({
        userId: "me",
        requestBody: {
          labelListVisibility: "labelShow",
          messageListVisibility: "show",
          name: "Test",
        },
      });
      TestLabel.push(createdLabel);
    }

    // get new email
    async function checkForNewEmails() {
      const response = await gmail.users.messages.list({
        userId: "me",
        q: "is:unread",
      });

      if (response.data.resultSizeEstimate) {
        return response.data.messages;
      }
    }

    checkForNewEmails().then(async (dataSet) => {
      for (let data of dataSet) {
        const messageData = await gmail.users.messages.get({
          userId: "me",
          id: data.id,
        });

        console.log(data);
        const headers = messageData.data.payload.headers;

        let fromHeader = "";
        for (let i = 0; i < headers.length; i++) {
          if (headers[i].name === "From") {
            fromHeader = headers[i].value;
            break;
          }
        }

        // Extract email address and name from the From header
        const from = fromHeader.match(/([^<]*)<([^>]*)>/);
        const fromName = from[1].trim();
        const fromEmail = from[2];

        // console.log(fromEmail);

        // emailing
        const message =
          "From: testautomailingapp@gmail.com\r\n" +
          `To: ${fromEmail}\r\n` +
          "Subject: check out bro\r\n\r\n" +
          "Auto Genereated reply, so please don't reply .";

        const raw = Buffer.from(message)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const sentResponse = await gmail.users.messages.send({
          userId: "testautomailingapp@gmail.com",
          requestBody: {
            raw: raw,
            labelIds: TestLabel[0].id,
            id: data.id,
            threadId: data.threadId,
            snippet: "This is a test email message",
            payload: {
              mimeType: "text/plain",
              headers: [
                {
                  name: "From",
                  value: "testautomailingapp@gmail.com",
                },
                {
                  name: "To",
                  value: fromEmail,
                },
                {
                  name: "Subject",
                  value: "Test email message",
                },
                {
                  name: "In-Reply-To",
                  value: fromEmail,
                },
                {
                  name: "Date",
                  value: Date.now(),
                },
              ],
            },
          },
        });

        if (sentResponse) {
          const res = await gmail.users.messages.modify({
            userId: "me",
            id: data.id,
            requestBody: {
              addLabelIds: [TestLabel[0].id],
            },
          });
        }
      }
    });

    // get all mails from a specified email
    async function getAllMailsByEmailId(fromEmail) {
      // getting all the email based on emailId
      const response = await gmail.users.messages.list({
        userId: "me",
        // q: "label:INBOX",
        q: `from:${fromEmail}`,
      });

      let threadIdCollectionForMailId = [];
      for (let messageMetaData of response.data.messages) {
        threadIdCollectionForMailId.push(messageMetaData.threadId);
      }

      const isRepliedArrayOfEmail = "";
      const promises = [];
      for (let threadId of threadIdCollectionForMailId) {
        const promise = new Promise((resolve, reject) => {
          resolve(getInfoOfThreadId(threadId));
        });

        promises.push(promise);
      }

      const resolvedData = await Promise.all(promises);
      if (resolvedData) {
        const hasElementGreaterThanOrEqualToTwo = resolvedData.some(
          (num) => num >= 2
        );

        console.log(hasElementGreaterThanOrEqualToTwo);
        if (hasElementGreaterThanOrEqualToTwo) {
          return null;
        } else {
          return fromEmail;
        }
      }
    }

    // get details regarding the threadId
    async function getInfoOfThreadId(threadId) {
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date", "Cc"],
      });

      return thread.data.messages.length;
    }
  })
  .catch((err) => console.log(err));
