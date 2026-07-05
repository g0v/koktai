#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <assert.h>

#define	maxNumberOfCharPerFile	(16*1024)

#define	operationList	(1)
#define	operationExport	(2)

#define	XFNTypeFaceMing		(0)
#define	XFNTypeFaceKai		(1)
#define	XFNTypeFaceRound	(2)
#define	XFNTypeFaceBlack	(3)
#define	XFNTypeFaceLi		(4)
#define	XFNTypeFaceShing	(5)
#define	XFNTypeFaceFonsung	(6)
#define	XFNTypeFaceMingLight	(7)
#define	XFNTypeFaceMingBold	(8)
#define	XFNTypeFaceBlackBold	(9)
#define	XFNTypeFaceSymbol	(10)

#define	SUCCESS	(0)
#define	FAIL	(1)

typedef struct {
	unsigned char	typeFace;
	unsigned char	codeHi;
	unsigned char	codeLo;
	unsigned char	size8;
	unsigned char	pos2;
	unsigned char	pos1;
	unsigned char	pos0;
	unsigned char	unknown;
} XFNChar;

typedef struct {
	unsigned char	id[6];
	unsigned short	numberOfChar;
	unsigned char	unknown[3];
	unsigned char	numberOfIndex;
	unsigned char	zero[4];
} XFNHeader;

typedef struct {
	FILE	*thefile;
	XFNHeader	header;
	XFNChar		at[maxNumberOfCharPerFile];
} XFNFile;

XFNFile *XFNFileOpenRead(const char *filename) {
	XFNFile	*xfnfile;
	int	numberOfItemsRead, i;

	xfnfile = (XFNFile *) calloc(sizeof(XFNFile), 1);
	if (xfnfile == NULL) {
		perror("XFNFileOpenRead()");
		exit(EXIT_FAILURE);
	}

	xfnfile->thefile = fopen(filename, "rb");
	if (xfnfile->thefile == NULL) {
		perror("XFNFileOpenRead()");
		exit(EXIT_FAILURE);
	}

	numberOfItemsRead = fread(&xfnfile->header, 
		sizeof(XFNHeader), 1, xfnfile->thefile);
	if (numberOfItemsRead == 0) {
		perror("XFNFileOpenRead()");
		exit(EXIT_FAILURE);
	}

	for (i=0; i<xfnfile->header.numberOfChar; i++) {
		numberOfItemsRead = fread(&xfnfile->at[i], 
			sizeof(XFNChar), 1, xfnfile->thefile);
		if (numberOfItemsRead == 0) {
			perror("XFNFileOpenRead()");
			exit(EXIT_FAILURE);
		}
	}

	return xfnfile;
}

XFNFile *XFNFileNew(void) {
	XFNFile	*xfnfile;

	xfnfile = (XFNFile *) calloc(sizeof(XFNFile), 1);
	xfnfile->header.id[0] = 'E';
	xfnfile->header.id[1] = 'T';
	xfnfile->header.id[2] = 0xFF;
	xfnfile->header.id[3] = 0xFF;
	xfnfile->header.id[4] = 0xFF;
	xfnfile->header.id[5] = 0xFF;
	xfnfile->header.numberOfChar = 0;
	xfnfile->header.unknown[0] = 0x10;
	xfnfile->header.unknown[1] = 0x7F;
	xfnfile->header.unknown[2] = 0;
	xfnfile->header.numberOfIndex = 1;
	xfnfile->header.zero[0] = 0;
	xfnfile->header.zero[1] = 0;
	xfnfile->header.zero[2] = 0;
	xfnfile->header.zero[3] = 0;

	return xfnfile;
}

void XFNFileList(XFNFile *xfnfile) {
	int	i;
	XFNHeader	*header;
	XFNChar		*achar;
	long	offset;

	header = &xfnfile->header;

	printf("Number of characters in file: %d\n", header->numberOfChar);
	printf("Number of index pages in file: %d (%s)\n",
		header->numberOfIndex,
		(header->numberOfChar / 256 + 1 == 
			header->numberOfIndex) ? "correct" : "incorrect");

	printf("\n");
	for (i=0; i<header->numberOfChar; i++) {
		achar = &xfnfile->at[i];

		printf("%4d:  %c%c  ", i, achar->codeHi, achar->codeLo);

		switch (achar->typeFace) {
			case XFNTypeFaceMing:
				printf("明體  ");
				break;
			case XFNTypeFaceKai:
				printf("楷書  ");
				break;
			case XFNTypeFaceRound:
				printf("圓體  ");
				break;
			case XFNTypeFaceBlack:
				printf("黑體  ");
				break;
			case XFNTypeFaceLi:
				printf("隸書  ");
				break;
			case XFNTypeFaceShing:
				printf("行書  ");
				break;
			case XFNTypeFaceFonsung:
				printf("仿宋  ");
				break;
			case XFNTypeFaceMingLight:
				printf("細明  ");
				break;
			case XFNTypeFaceMingBold:
				printf("粗明  ");
				break;
			case XFNTypeFaceBlackBold:
				printf("粗黑  ");
				break;
			case XFNTypeFaceSymbol:
				printf("符號  ");
				break;
			default:
				printf("未知  ");
				break;
		}

		printf("%3d x %-3d  %2X%2X  ", achar->size8*8, achar->size8*8,
			achar->codeHi, achar->codeLo);

		offset = ((long)achar->pos2 << 16) | ((long)achar->pos1 << 8) | (long)achar->pos0;
		printf("%ld\n", offset);
	}
}

int main(int argc, char *argv[]) {
	XFNFile	*xfn;
	char	optchar;
	int	operation;
	int	i;

	while ((optchar = getopt(argc, argv, "Ll") != -1)) {
		/* printf("%d\t%c\n", optopt, optopt); */
		switch (optopt) {
			case 'l':	
				operation = operationList;
				break;
			case 'e':
				operation = operationExport;
			case '?':
				printf("%s\n", argv[optind]);
				break;
		}
	}

	/* printf("%d\t%d\t%d\t%s\n", operation, operationList, optind, argv[optind]); */

	switch (operation) {
		case operationList:
			xfn = XFNFileOpenRead(argv[optind]);
			XFNFileList(xfn);
			break;
		case operationExport:
			xfn = XFNFileOpenRead(argv[optind]);
			break;
	}

	return 0;
}
