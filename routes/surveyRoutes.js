const mongoose = require("mongoose");
const _ = require("lodash");
const { Path } = require("path-parser");
const { URL } = require("url");

const requireLogin = require("../middlewares/requireLogin");
const requireCredits = require("../middlewares/requireCredits");
const Mailer = require("../services/Mailer");
const surveyTemplate = require("../services/emailTemplates/surveyTemplate");

const Survey = mongoose.model("surveys");

module.exports = (app) => {
  app.get("/api/surveys/thanks", (req, res) => {
    res.send("Thank you for your feedback");
  });

  app.post("/api/surveys", requireLogin, requireCredits, async (req, res) => {
    const { title, subject, body, recipients } = req.body;

    const survey = new Survey({
      title,
      subject,
      body,
      recipients: recipients
        .split(",")
        .map((email) => ({ email: email.trim() })),
      _user: req.user.id,
      dateSent: Date.now(),
    });

    // send an email
    const mailer = new Mailer(survey, surveyTemplate(survey));

    try {
      await mailer.send();

      await survey.save();
      req.user.credits -= 1;
      const user = await req.user.save();

      res.send(user);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.post("/api/surveys/webhooks", (req, res) => {
    const p = new Path("/api/surveys/:surveyId/:choice");

    const events = req.body.map(({ email, url }) => {
      const pathName = new URL(url).pathname;
      const match = p.test(pathName);
      if (match) {
        return {
          email,
          surveyId: match.surveyId,
          choice: match.choice,
        };
      }
    });

    const compactEvents = _.compact(events);
    const uniqueEvents = _.uniqBy(compactEvents, "email", "surveyId");

    uniqueEvents.forEach(({ surveyId, email, choice }) => {
      Survey.updateOne(
        {
          _id: surveyId,
          recipients: {
            $elemMatch: {
              email: email,
              responded: false,
            },
          },
        },
        {
          $inc: { [choice]: 1 }, // increment by 1
          // set responded value from the rescipients that found from serching to true
          $set: { "recipients.$.responded": true },
        }
      ).exec();
    });

    res.send({});
  });
};
