#include <stdio.h>
#include <stdlib.h>

#define	BUFFER_SIZE	16384

int main(int argc, char *argv[]) {
	char	*input_filename, *output_filename;
	long	begin_byte, end_byte, remain_length;
	size_t	read_length;
	FILE	*input_file, *output_file;
	void	*buffer;

	if (argc != 5) {
		printf("%s input_filename output_filename begin_byte end_byte\n", argv[0]);
		exit(1);
	}

	input_filename = argv[1];
	output_filename = argv[2];
	begin_byte = atol(argv[3]);
	end_byte = atol(argv[4]);
	remain_length = end_byte - begin_byte;

	input_file = fopen(input_filename, "rb");
	if (input_file == NULL) {
		perror(argv[0]);
		exit(1);
	}
	output_file = fopen(output_filename, "wb");
	if (input_file == NULL) {
		perror(argv[0]);
		exit(1);
	}

	fseek(input_file, begin_byte, SEEK_SET);

	buffer = malloc(BUFFER_SIZE);

	while (remain_length > 0) {
		if (remain_length > BUFFER_SIZE)
			read_length = BUFFER_SIZE;
		else
			read_length = remain_length;
		fread(buffer, read_length, 1, input_file);
		fwrite(buffer, read_length, 1, output_file);
		remain_length -= read_length;
	}

	fclose(output_file);
	fclose(input_file);

	return 0;
}
