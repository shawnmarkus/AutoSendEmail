var { authorize, listLabels } = require("./authorize");
const { google } = require("googleapis");
// the auth will contain the verified credentials
let auth;

// to get the credentials
authorize()
  .then((Authdata) => {
    auth = Authdata;
    listLabels(auth);

    const gmail = google.gmail({ version: "v1", auth });

    async function checkForNewEmails() {
      // Get the list of unread messages in the user's inbox
      //   let newEmailDetail = {};
      let newEmailDetail = new Set();
      console.log("$$$$$$$$$$$$$$$$$$$$$$$");
      const response = await gmail.users.messages.list({
        userId: "me",
        // q: "label:INBOX",
        q: "is:unread",
      });

      // Process each unread message
      //   let count = 1; //just for check

      if (response.data.resultSizeEstimate) {
        for (let message of response.data.messages) {
          // console.log("the read msg ===> ", message);

          const messageData = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
          });

          // console.log(messageData.data.payload.headers);

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

          newEmailDetail.add(fromEmail);

          // -----------------------------------when line 16 :   let newEmailDetail = {} will exist;
          //   if (newEmailDetail[fromEmail]) {
          //     newEmailDetail[fromEmail].push(message.threadId);
          //   } else {
          //     newEmailDetail[fromEmail] = [message.threadId];
          //   }

          //   -------------------------------------------end here ------------------------------------

          //   console.log(
          //     count,
          //     "---------------------------\n",
          //     newEmailDetail,
          //     "\n"
          //   );
          //   count++;
        }
      }
      return newEmailDetail;
    }

    checkForNewEmails().then((dataSet) => {
      for (let emailId of dataSet) {
        getAllMailsByEmailId(emailId).then((threadData) => {
          if (threadData) {
            console.log(threadData);
          } else {
            console.log("Noting retured");
          }
        });
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
          return fromEmail;
        } else {
          return null;
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
