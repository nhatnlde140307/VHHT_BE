export const MailGenerator = {
  generate: jest.fn().mockReturnValue('<p>Mocked Email</p>')
};
export const transporter = {
  sendMail: jest.fn().mockResolvedValue(true)
};
