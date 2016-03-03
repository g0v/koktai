# -*- coding: utf-8  -*-
import requests
import pywikibot,  sys
from upload import UploadRobot
import os


def complete_desc_and_upload(filename, pagetitle, code, date):
    #complete this once if applies to all files

    description = u"""{{Information
|Description    = {{en|1=Non-encodable character, coded """ + code + u""" in original Koktai dictionnary}}
|Source         = https://github.com/g0v/koktai
|Author         = 吳壽禮
|Date           = """ + date + u"""
|Permission     = {{Cc-by-sa-4.0|吳壽禮}}
}}
=={{int:license-header}}==
CC-BY-SA

"""
    url = filename
    keepFilename=True #False        #set to True to skip double-checking/editing destination filename
    verifyDescription=False #True    #set to False to skip double-checking/editing description => change to bot-mode
    targetSite = pywikibot.Site('commons', 'commons')
    bot = UploadRobot(url, description=description, useFilename=pagetitle, keepFilename=keepFilename, verifyDescription=verifyDescription, targetSite = targetSite)
    bot.upload_image(debug=True)
    #print "would upload", url, description, pagetitle, keepFilename, verifyDescription, targetSite



def main(args):
    #list each file here
    for path in args:
        basename = os.path.basename(path)
        code = basename.rsplit(".",1)[0]
        filename = path
        pagetitle = u"Koktai dictionary missing char " + basename + ".png"
        r =  requests.get("https://commons.wikimedia.org/wiki/File:Koktai_dictionary_missing_char_%s.png" % (basename,))
        if not r.ok:
            date = "2016-03-02"
            complete_desc_and_upload(filename, pagetitle, code, date)
        else:
            print(basename, "allready uploaded")


if __name__ == "__main__":
    main(sys.argv[1:])
    pywikibot.stopme()

