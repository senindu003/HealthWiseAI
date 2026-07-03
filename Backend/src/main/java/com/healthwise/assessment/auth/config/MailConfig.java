package com.healthwise.assessment.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Only registers a real {@link JavaMailSender} when an SMTP host is actually configured
 * (a blank/unset MAIL_HOST yields a null bean). {@code MailServiceImpl} injects this as
 * {@code Optional<JavaMailSender>} and falls back to logging instead of sending when
 * empty, so registration/reset flows remain testable without real SMTP credentials.
 */
@Configuration
public class MailConfig {

    @Bean
    public JavaMailSender javaMailSender(
            @Value("${mail.host}") String host,
            @Value("${mail.port}") int port,
            @Value("${mail.username}") String username,
            @Value("${mail.password}") String password,
            @Value("${mail.smtp-auth}") boolean smtpAuth,
            @Value("${mail.smtp-starttls}") boolean smtpStartTls) {
        if (host == null || host.isBlank()) {
            return null;
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(smtpAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(smtpStartTls));
        return sender;
    }
}
