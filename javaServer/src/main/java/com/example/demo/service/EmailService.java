package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /** Throws MailException if the SMTP server rejects or can't be reached. */
    public void sendVerificationCode(String to, String code) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject("Your PharmaCom verification code");
        msg.setText(
                "Your verification code is: " + code + "\n\n"
                + "It expires in 10 minutes. If you didn't request it, you can ignore this email.");
        mailSender.send(msg);
    }

    /** Code for a sensitive account change. Throws MailException if the SMTP server rejects or can't be reached. */
    public void sendAccountCode(String to, String code, String purposeText) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject("Codul tău PharmaCom: " + purposeText);
        msg.setText(
                "Codul tău pentru " + purposeText + " este: " + code + "\n\n"
                + "Expiră în 10 minute. Dacă nu tu ai cerut acest cod, ignoră emailul și "
                + "schimbă-ți parola, pentru că cineva ar putea avea acces la contul tău.");
        mailSender.send(msg);
    }

    /** Sent to the OLD address after the email was changed, so a hijacked account doesn't go unnoticed. */
    public void sendEmailChangedNotice(String oldEmail, String newEmail) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(oldEmail);
        msg.setSubject("Adresa de email a contului tău PharmaCom a fost schimbată");
        msg.setText(
                "Adresa de email a contului tău a fost schimbată în " + newEmail + ".\n\n"
                + "Dacă nu tu ai făcut această schimbare, contactează-ne imediat.");
        mailSender.send(msg);
    }
}
