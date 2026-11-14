package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
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
}
