module.exports = (survey) => {
  return `
    <html>
      <body>
        <div style="text-align: center;">
          <h3>We would like your feedback</h3>
          <p>Do you like our app?</p>
          <p>${survey.body}</p>
          <div>
            <a href="http://localhost:3000">Yes</a>
          </div>
          <div>
            <a href="http://localhost:3000">No</a>
          </div>
        </div>
      </body>
    </html>
  `;
};
