package com.healthwise.assessment.auth.service.impl;

import com.healthwise.assessment.auth.service.MailService;
import com.healthwise.assessment.user.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class MailServiceImpl implements MailService {

    private static final Logger log = LoggerFactory.getLogger(MailServiceImpl.class);

    private final Optional<JavaMailSender> mailSender;
    private final String fromAddress;

    public MailServiceImpl(Optional<JavaMailSender> mailSender,
                            @Value("${mail.from-address}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendVerificationEmail(User user, String verificationLink) {
        send(user.getEmail(), "Verify your HealthWise AI account",
                "Hi " + user.getFullName() + ",\n\n"
                        + "Welcome to HealthWise AI! Please verify your email address by clicking the link below:\n\n"
                        + verificationLink + "\n\n"
                        + "If you didn't create this account, you can safely ignore this email.");
    }

    @Override
    public void sendPasswordResetEmail(User user, String resetLink) {
        send(user.getEmail(), "Reset your HealthWise AI password",
                "Hi " + user.getFullName() + ",\n\n"
                        + "We received a request to reset your password. Click the link below to choose a new one:\n\n"
                        + resetLink + "\n\n"
                        + "This link expires soon and can only be used once. "
                        + "If you didn't request this, you can safely ignore this email.");
    }

    private void send(String to, String subject, String body) {
        if (mailSender.isEmpty()) {
            log.info("[DEV MAIL FALLBACK] To: {} Subject: {}\n{}", to, subject, body);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.get().send(message);
    }
}
