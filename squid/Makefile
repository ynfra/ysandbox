.PHONY: ssl
ssl:
	openssl req -new -newkey rsa:4096 -days 3650 -nodes -x509 \
		-keyout ./squid/squid-ca.pem \
		-out ./squid/squid-ca.pem \
		-subj "/C=US/ST=State/L=City/O=Ynfra/CN=Ynfra"

	openssl x509 -in ./squid/squid-ca.pem -outform DER -out ./squid/squid-ca.der
