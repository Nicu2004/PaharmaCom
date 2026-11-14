import smtplib

USER = "mamaliganicu2004@gmail.com"
PASS = "hicw ydyg qjaf fuqo"   # the 16-character app password

print("PASSWORD LENGTH:", len(PASS), "| ASCII only:", PASS.isascii())

# Try 1: STARTTLS on 587
try:
    s = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
    s.set_debuglevel(1)
    s.ehlo()
    s.starttls()
    s.ehlo()
    s.login(USER, PASS)
    print("LOGIN OK on 587")
    s.quit()
except Exception as e:
    print("587 failed:", repr(e))

# Try 2: implicit SSL on 465
try:
    s = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15)
    s.set_debuglevel(1)
    s.login(USER, PASS)
    print("LOGIN OK on 465")
    s.quit()
except Exception as e:
    print("465 failed:", repr(e))