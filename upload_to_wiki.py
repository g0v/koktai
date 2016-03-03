import mwclient
import argparse
import urllib



def main():
    parser = argparse.ArgumentParser(description='Upload content to Wikisource.')
    parser.add_argument("files", type=str, nargs='+')
    parser.add_argument('-u', '--username', type=str, nargs=1)
    parser.add_argument('-p', '--password', type=str, nargs=1)
    parser.add_argument('-r', '--root',type=str, action="store",default="A-Chioh:User/Koktai/")
    args = parser.parse_args()
    site = mwclient.Site('zh.wikisource.org')
    site.login(args.username, args.password)
    for f in args.files:
        text = open(f,"r").read()
        url = (args.root + f).decode("utf8")
        print url
        page = site.pages[url]
        print page
        page.save(text)
        


        
if __name__ == "__main__":
    main()
