package com.example.demo.service;

import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class MailConfigCheck implements CommandLineRunner {

    @Value("${spring.mail.username}") private String user;
    @Value("${spring.mail.password}") private String pass;
    @Value("${spring.mail.host}")     private String host;
    @Value("${spring.mail.port}")     private int port;

    @Override
    public void run(String @NonNull ... args) {
        System.out.println("MAIL CHECK -> host=" + host + " port=" + port
                + " user=[" + user + "] passwordLength=" + pass.length());
    }
}