<?php declare(strict_types = 1);

do {
	$running = frankenphp_handle_request(function () {
		echo "Hello FrankenPHP!";
		phpinfo();
	});

	gc_collect_cycles();
} while ($running);
